const { OpenAI } = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const supabase = require("../config/supabase");

exports.aiAssistant = async (req, res) => {
    // ... (OpenAI / Gemini Key Setup & Validation Same As Before) ...
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const user = req.user; // Assuming authMiddleware populates this with Supabase User data
    const userId = user.id || user._id;

    const type = (req.body.type || "").toLowerCase();
    const cleanInput = (req.body.message || "").trim();

    if (user.ai_credits < 1) return res.status(403).json({ success: false, message: "AI limit reached" });

    // ... (Model selection logic same as before) ...
    let provider = "gemini"; // simplified for snippet
    let currentModel = "gemini-1.5-flash"; 

    // Fetch Chat History
    let { data: chat } = await supabase.from('chats').select('*').eq('user_id', userId).maybeSingle();
    if (!chat) chat = { user_id: userId, messages: [] };

    const profile = `User Profile:\n- Name: ${user.name}\n- Gender: ${user.gender}\n- Current Weight: ${user.current_weight}`;
    const systemPrompt = `You are XIO, a professional fitness coach AI.`;

    let prompt = `System:\n${systemPrompt}\n\nUser Profile:\n${profile}\n\nUser Question:\n${cleanInput}`;
    
    chat.messages.push({ role: "user", content: cleanInput });

    let aiResponseText = "";
    try {
        // ... (API Call to Gemini/OpenAI same as before) ...
        const genAI = new GoogleGenerativeAI(geminiKey);
        const modelInfo = genAI.getGenerativeModel({ model: currentModel });
        const result = await modelInfo.generateContent(prompt);
        aiResponseText = result.response.text();

        if (type === "chat") {
            chat.messages.push({ role: "assistant", content: aiResponseText });
            if (chat.messages.length > 50) chat.messages = chat.messages.slice(-50);
            
            // Save Chat to Supabase
            await supabase.from('chats').upsert({ user_id: userId, messages: chat.messages }, { onConflict: 'user_id' });
        }

        // Update User Credits
        await supabase.from('users').update({
            ai_credits: user.ai_credits - 1,
            ai_used: (user.ai_used || 0) + 1,
            ai_last_used_at: new Date()
        }).eq('id', userId);

        return res.json({ success: true, providerUsed: provider, data: aiResponseText });
    } catch (error) {
        return res.status(500).json({ success: false, message: "AI service failed" });
    }
};