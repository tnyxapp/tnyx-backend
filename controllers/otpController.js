const { sendOtpService, verifyOtpService } = require("../services/otpService");
const admin = require("../config/firebase");
const supabase = require("../config/supabase");

exports.sendOtp = async (req, res) => { /* तुम्हारा पुराना कोड बिल्कुल सही है */ };
exports.verifyOtp = async (req, res) => { /* तुम्हारा पुराना कोड बिल्कुल सही है */ };

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