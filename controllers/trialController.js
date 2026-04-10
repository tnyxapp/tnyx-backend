// controllers/trialController.js
const User = require("../models/User");
const Device = require("../models/Device");

exports.activateTrial = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (user.isTrialUsed) {
            return res.status(400).json({ success: false, message: "Trial already used on this account/device" });
        }

        // 🔥 ट्रायल शुरू करें
        user.trialStart = new Date();
        user.trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 दिन
        user.isTrialUsed = true;
        user.aiCredits += 50; 

        await user.save();

        // Device रिकॉर्ड अपडेट करें
        if (user.deviceId) {
            await Device.findOneAndUpdate(
                { deviceId: user.deviceId }, 
                { trialUsed: true }, 
                { upsert: true }
            );
        }

        res.status(200).json({ 
            success: true, 
            message: "Trial activated! Enjoy 7 days of Pro.",
            trialEnd: user.trialEnd,
            aiCredits: user.aiCredits
        });
    } catch (err) {
        console.error("Trial Activation Error:", err);
        res.status(500).json({ success: false, message: "Failed to activate trial" });
    }
};