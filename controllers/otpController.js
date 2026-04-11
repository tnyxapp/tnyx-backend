//controllers/otpController.js
const { sendOtpService, verifyOtpService } = require("../services/otpService");
const admin = require("../config/firebase");
const supabase = require("../config/supabase");

// ✅ SEND OTP CONTROLLER
exports.sendOtp = async (req, res) => {
    try {
        const { email, type } = req.body;
        
        if (!email || !type) {
            return res.status(400).json({ success: false, message: "Email and type are required" });
        }

        // सर्विस कॉल करें
        const result = await sendOtpService(email, type);
        return res.status(200).json(result);

    } catch (error) {
        console.error("❌ Send OTP Error:", error.message);
        const statusCode = error.message.includes("Wait") ? 429 : 400; // 429: Too Many Requests
        return res.status(statusCode).json({ success: false, message: error.message || "Failed to send OTP" });
    }
};

// ✅ VERIFY OTP CONTROLLER
exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp, type } = req.body;

        if (!email || !otp || !type) {
            return res.status(400).json({ success: false, message: "Email, OTP, and type are required" });
        }

        // सर्विस कॉल करें
        const result = await verifyOtpService(email, otp, type);
        return res.status(200).json(result);

    } catch (error) {
        console.error("❌ Verify OTP Error:", error.message);
        const statusCode = error.message.includes("Too many attempts") ? 429 : 400;
        return res.status(statusCode).json({ success: false, message: error.message || "Failed to verify OTP" });
    }
};

// ✅ LINK EMAIL CONTROLLER
exports.linkEmail = async (req, res) => {
    try {
        let { email, otp } = req.body;
        const uid = req.user.firebase_uid || req.user.uid;

        email = email?.toLowerCase().trim();
        if (!email || !otp) return res.status(400).json({ success: false, message: "Email and OTP required" });

        await verifyOtpService(email, otp, "LINK_EMAIL");
        await admin.auth().updateUser(uid, { email: email });

        // Update in Supabase
        await supabase.from('users').update({ email: email }).eq('firebase_uid', uid);

        return res.status(200).json({ success: true, message: "Email linked successfully ✅" });
    } catch (error) {
        const statusCode = error.message.includes("OTP") ? 400 : 500;
        return res.status(statusCode).json({ success: false, message: error.message || "Failed to link email" });
    }
};