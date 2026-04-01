const Otp = require("../models/Otp");
const admin = require("../config/firebase");
const sendEmail = require("../utils/sendEmail");
const User = require("../models/User");

exports.sendOtp = async (req, res) => {
    const { email } = req.body;
    try {
        await admin.auth().getUserByEmail(email);

        const user = await User.findOne({ email });

        if (user && user.isDeleted) {
            return res.status(403).json({
                success: false,
                message: "Account deleted. Please recover first"
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await Otp.deleteMany({ email });
        await Otp.create({ email, otp, expiresAt });
        await sendEmail(email, otp);

        res.json({ success: true, message: "OTP sent successfully ✅" });

    } catch (error) {
        res.status(400).json({ success: false, message: "User not found or Error" });
    }
};

exports.verifyOtp = async (req, res) => {
    const { email, otp } = req.body;
    try {
        const record = await Otp.findOne({ email }).sort({ createdAt: -1 });
        if (!record || record.otp !== otp || record.expiresAt < new Date()) {
            return res.status(400).json({ success: false, message: "Invalid or Expired OTP" });
        }
// ✅ OTP used → delete
await Otp.deleteMany({ email });
        res.json({ success: true, message: "OTP verified ✅" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
};
