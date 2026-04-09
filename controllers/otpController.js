const { sendOtpService, verifyOtpService } = require("../services/otpService");
const admin = require("../config/firebase");
const User = require("../models/User");

// ✅ SEND OTP
exports.sendOtp = async (req, res) => {
    try {
        let { email, type } = req.body;

        // 🔥 sanitize
        email = email?.toLowerCase().trim();

        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }

        // 👉 type पास करें (अगर नहीं आएगा तो डिफ़ॉल्ट RESET_PASSWORD रहेगा)
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
        // 👉 NEW: type भी निकालो
        let { email, otp, type } = req.body; 

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

        // 👉 NEW: type पास करो (डिफ़ॉल्ट RESET_PASSWORD)
        const result = await verifyOtpService(email, otp, type || "RESET_PASSWORD");

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

// ✅ LINK EMAIL
exports.linkEmail = async (req, res) => {
    try {
        let { email, otp } = req.body;
        const uid = req.user.firebaseUid;

        email = email?.toLowerCase().trim();

        if (!email || !otp) {
            return res.status(400).json({ success: false, message: "Email and OTP are required" });
        }

        // 1. 🔥 OTP वेरीफाई करें (👉 NEW: "LINK_EMAIL" type explicitly पास करें)
        await verifyOtpService(email, otp, "LINK_EMAIL");

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