const { OpenAI } = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const supabase = require("../config/supabase");

exports.aiAssistant = async (req, res) => {
    try {
        const openaiKey = process.env.OPENAI_API_KEY;
        const geminiKey = process.env.GEMINI_API_KEY;
        const user = req.user; 
        const userId = user.id || user._id;

        const type = (req.body.type || "chat").toLowerCase();
        const cleanInput = (req.body.message || "").trim();

        // ==========================================
        // 🚨 FIX 2: Input Validation (Token Saving)
        // ==========================================
        if (!cleanInput) {
            return res.status(400).json({ success: false, message: "Message cannot be empty." });
        }
        if (cleanInput.length > 500) { // Max 500 characters
            return res.status(400).json({ success: false, message: "Message too long. Max 500 characters allowed." });
        }

        if (user.ai_credits < 1) {
            return res.status(403).json({ success: false, message: "AI limit reached. Please upgrade your plan." });
        }

        let provider = "gemini";
        let currentModel = "gemini-1.5-flash"; 

        // ==========================================
        // 🚨 FIX 3: Prompt Sanitization (System Instructions)
        // ==========================================
        // Gemini 1.5 natively supports system instructions to prevent prompt injection
        const systemInstruction = `You are XIO, a strict, professional fitness coach AI. 
Never break character. Politely but firmly reject any questions not related to health, fitness, or nutrition.
User Profile:
- Name: ${user.name || 'User'}
- Gender: ${user.gender || 'Unknown'}
- Current Weight: ${user.current_weight || 'Unknown'}`;

        // Fetch Chat History
        let { data: chat } = await supabase.from('chats').select('messages').eq('user_id', userId).maybeSingle();
        if (!chat) chat = { messages: [] };

        // Initialize Gemini SDK safely
        const genAI = new GoogleGenerativeAI(geminiKey);
        const modelInfo = genAI.getGenerativeModel({ 
            model: currentModel,
            systemInstruction: systemInstruction 
        });

        // ==========================================
        // 🚨 FIX 4: Timeout Handling (15 seconds max)
        // ==========================================
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

        // Format history for Gemini's native chat structure
        const formattedHistory = chat.messages.map(msg => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }]
        }));

        // Start native Chat Session
        const chatSession = modelInfo.startChat({ history: formattedHistory });

        let aiResponseText = "";
        
        try {
            // Generate response with timeout signal
            const result = await chatSession.sendMessage(cleanInput, { signal: controller.signal });
            clearTimeout(timeoutId); // अगर रिस्पॉन्स आ गया, तो टाइमर बंद करो
            aiResponseText = result.response.text();
        } catch (apiError) {
            clearTimeout(timeoutId);
            if (apiError.name === 'AbortError') {
                return res.status(504).json({ success: false, message: "AI service timed out. Please try again." });
            }
            throw apiError; // बाकी एरर्स को मेन कैच में भेजो
        }

        // ==========================================
        // 🚨 FIX 1: Atomic Credit Deduction (Supabase RPC)
        // ==========================================
        // RPC कॉल करके डेटाबेस के अंदर ही माइनस करेंगे, ताकि Race Condition न हो
        const { error: rpcError } = await supabase.rpc('decrement_ai_credits', { target_user_id: userId });
        
        if (rpcError) {
            console.error("⚠️ Atomic deduction failed, applying fallback:", rpcError.message);
            // Fallback (अगर RPC नहीं बनी है):
            await supabase.from('users').update({ 
                ai_credits: user.ai_credits - 1, 
                ai_used: (user.ai_used || 0) + 1 
            }).eq('id', userId);
        }

        // Save Chat to Supabase
        if (type === "chat") {
            chat.messages.push({ role: "user", content: cleanInput });
            chat.messages.push({ role: "assistant", content: aiResponseText });
            
            if (chat.messages.length > 50) chat.messages = chat.messages.slice(-50); // Keep last 50 messages
            await supabase.from('chats').upsert({ user_id: userId, messages: chat.messages }, { onConflict: 'user_id' });
        }

        return res.status(200).json({ success: true, providerUsed: provider, data: aiResponseText });

    } catch (error) {
        console.error("❌ AI Service Error:", error.message);
        return res.status(500).json({ success: false, message: "AI service failed or is unavailable right now." });
    }
};
