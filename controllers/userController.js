const User = require("../models/User");
const Device = require("../models/Device");

// ✅ ACTIVATE 7-DAY TRIAL
exports.startFreeTrial = async (req, res) => {
    try {
        const userId = req.user._id; // Auth Middleware से मिलेगा
        const { deviceId } = req.body; // Frontend से Button Click पर आएगा

        if (!deviceId) {
            return res.status(400).json({ success: false, message: "Device ID is required" });
        }

        const user = await User.findById(userId);

        // 1. क्या इस यूज़र ने पहले ट्रायल लिया है?
        if (user.isTrialUsed) {
            return res.status(403).json({ success: false, message: "You have already used a trial on this account." });
        }

        // 2. 🔴 क्या इस DEVICE पर पहले ट्रायल लिया जा चुका है? (Anti-Abuse)
        let deviceRecord = await Device.findOne({ deviceId });
        
        if (deviceRecord && deviceRecord.trialUsed) {
            return res.status(403).json({ 
                success: false, 
                message: "A free trial has already been used on this device. Please upgrade to continue." 
            });
        }

        // 3. ✅ सब सही है! ट्रायल चालू करें
        const now = new Date();
        const trialEndDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 Days from now

        user.trialStart = now;
        user.trialEnd = trialEndDate;
        user.isTrialUsed = true;
        
        // ट्रायल के बेनेफिट्स दें (उदाहरण के लिए)
        user.aiPlan = "pro"; 
        user.aiCredits += 50; 
        await user.save();

        // 4. डिवाइस को मार्क कर दें कि इस पर ट्रायल यूज़ हो चुका है
        if (!deviceRecord) {
            deviceRecord = new Device({ deviceId, trialUsed: true });
        } else {
            deviceRecord.trialUsed = true;
        }
        await deviceRecord.save();

        return res.status(200).json({
            success: true,
            message: "7-Day Free Trial started successfully!",
            trialEnd: user.trialEnd
        });

    } catch (error) {
        console.error("🔴 Start Trial Error:", error);
        return res.status(500).json({ success: false, message: "Failed to start trial" });
    }
};