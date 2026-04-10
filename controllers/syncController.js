//controllers/syncController.js
const User = require("../models/User");

exports.syncUserStatus = async (req, res) => {
    try {
        // req.user authMiddleware से आता है
        const user = await User.findById(req.user._id); 

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (user.isDeleted) {
            return res.status(403).json({ success: false, message: "Account is deleted" });
        }

        // ==========================================
        // 🔥 EXPIRY CHECK LOGIC (Trial / Pro Expiry)
        // ==========================================
        const now = new Date();
        let isPlanExpired = false;

        // अगर यूज़र का Trial End Date मौजूद है और आज की तारीख उससे आगे निकल गई है
        if (user.trialEnd && now > user.trialEnd) {
            // अगर वो पहले से free पर नहीं है, तो उसे free पर ले आओ
            if (user.aiPlan !== "free") {
                user.aiPlan = "free";
                user.aiCredits = 10; // तुरंत Free वाली लिमिट सेट कर दो
                user.aiTotalLimit = 10;
                
                isPlanExpired = true;
                
                // ध्यान दें: हम isTrialUsed को true ही रहने देंगे ताकि वो दोबारा फ्री ट्रायल न ले सके
                await user.save();
                console.log(`Trial expired for user: ${user.email}. Downgraded to free.`);
            }
        }

        // ==========================================

        return res.status(200).json({
            success: true,
            isPlanExpired: isPlanExpired, // Frontend को बता सकते हैं कि प्लान एक्सपायर हो गया
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                profileImage: user.profileImage,
                aiPlan: user.aiPlan,
                aiCredits: user.aiCredits,
                trialEnd: user.trialEnd,
                isTrialUsed: user.isTrialUsed
                // बाकी जो भी डेटा तुम्हें ऐप खुलते ही चाहिए...
            }
        });

    } catch (error) {
        console.error("Check User Error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};