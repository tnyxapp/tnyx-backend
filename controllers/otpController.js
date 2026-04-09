const { sendOtpService, verifyOtpService } = require("../services/otpService");

const admin = require("../config/firebase");
const User = require("../models/User");

// ✅ SEND OTP (Updated)
exports.sendOtp = async (req, res) => {
    try {
        let { email, type } = req.body; // 👉 type को req.body से निकाला

        // 🔥 sanitize
        email = email?.toLowerCase().trim();

        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }

        // 👉 type पास करें (अगर नहीं आएगा तो डिफ़ॉल्ट RESET_PASSWORD रहेगा)
        const result = await sendOtpService(email, type || "RESET_PASSWORD");

        return res.status(200).json(result);

    } catch (error) {
        const statusCode =
            error.message.includes("Wait") ? 429 :
            error.message.includes("not allowed") ? 400 :
            error.message.includes("already linked") ? 409 : 400;

        return res.status(statusCode).json({ success: false, message: error.message });
    }
};


// ✅ VERIFY OTP
exports.verifyOtp = async (req, res) => {
    try {
        let { email, otp } = req.body;

        // 🔥 sanitize
        email = email?.toLowerCase().trim();

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required"
            });
        }

        // 🔥 OTP format check
        if (!/^\d{6}$/.test(otp)) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP format"
            });
        }

        const result = await verifyOtpService(email, otp);

        return res.status(200).json(result);

    } catch (error) {

        const statusCode =
            error.message.includes("Too many attempts") ? 429 :
            error.message.includes("expired") ? 400 :
            400;

        return res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};
exports.linkEmail = async (req, res) => {
    try {
        let { email, otp } = req.body;
        const uid = req.user.uid; // 👈 authMiddleware से असली यूज़र की ID मिलेगी

        email = email?.toLowerCase().trim();

        if (!email || !otp) {
            return res.status(400).json({ success: false, message: "Email and OTP are required" });
        }

        // 1. 🔥 OTP वेरीफाई करें (अगर गलत हुआ तो यही से एरर वापस चला जाएगा)
        await verifyOtpService(email, otp);

        // 2. 🔥 Firebase में ईमेल अपडेट करें
        await admin.auth().updateUser(uid, { email: email });

        // 3. 🔥 MongoDB में ईमेल अपडेट करें
        await User.findOneAndUpdate(
            { firebaseUid: uid },
            { email: email },
            { new: true }
        );

        return res.status(200).json({
            success: true,
            message: "Email linked successfully ✅"
        });

    } catch (error) {
        console.error("❌ linkEmail error:", error.message);
        
        const statusCode = error.message.includes("OTP") ? 400 : 500;
        return res.status(statusCode).json({
            success: false,
            message: error.message || "Failed to link email"
        });
    }
};