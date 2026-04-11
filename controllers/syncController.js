// controllers/syncController.js
const supabase = require("../config/supabase"); // 🔥 Supabase Import

exports.syncUserStatus = async (req, res) => {
    try {
        // req.user authMiddleware से आता है। 
        // (अगर तुमने authMiddleware अपडेट नहीं किया है तो शायद _id आ रहा हो, इसलिए दोनों चेक लगा दिए हैं)
        const userId = req.user.id || req.user._id; 

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (error || !user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (user.is_deleted) {
            return res.status(403).json({ success: false, message: "Account is deleted" });
        }

        // ==========================================
        // 🔥 EXPIRY CHECK LOGIC (Trial / Pro Expiry)
        // ==========================================
        const now = new Date();
        let isPlanExpired = false;

        // अगर यूज़र का Trial End Date मौजूद है और आज की तारीख उससे आगे निकल गई है
        if (user.trial_end && now > new Date(user.trial_end)) {
            // अगर वो पहले से free पर नहीं है, तो उसे free पर ले आओ
            if (user.ai_plan !== "free") {
                
                // लोकल ऑब्जेक्ट अपडेट करें ताकि इसी रिस्पॉन्स में नया डेटा जाए
                user.ai_plan = "free";
                user.ai_credits = 10; 
                user.ai_total_limit = 10;
                
                isPlanExpired = true;
                
                // 🔥 Supabase में Update करें
                const { error: updateError } = await supabase
                    .from('users')
                    .update({
                        ai_plan: "free",
                        ai_credits: 10,
                        ai_total_limit: 10
                    })
                    .eq('id', user.id);

                if (!updateError) {
                    console.log(`Trial expired for user: ${user.email}. Downgraded to free.`);
                }
            }
        }

        // ==========================================

        return res.status(200).json({
            success: true,
            isPlanExpired: isPlanExpired, // Frontend को बता सकते हैं कि प्लान एक्सपायर हो गया
            user: {
                id: user.id, // Supabase UUID
                name: user.name,
                email: user.email,
                profileImage: user.profile_image,
                aiPlan: user.ai_plan,
                aiCredits: user.ai_credits,
                trialEnd: user.trial_end,
                isTrialUsed: user.is_trial_used
                // बाकी जो भी डेटा तुम्हें ऐप खुलते ही चाहिए...
            }
        });

    } catch (error) {
        console.error("Check User Error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};