const admin = require("../config/firebase");
const Otp = require("../models/Otp");
const User = require("../models/User");

exports.resetPassword = async (req, res) => {
  try {
    let { email, otp, newPassword } = req.body;

    // 🔥 sanitize
    email = email?.toLowerCase().trim();

    // 🔥 validation
    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    // 🔥 OTP format check
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP format"
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters"
      });
    }

    // 🔥 user check
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.isDeleted) {
      return res.status(403).json({
        success: false,
        message: "Account deleted. Recover first"
      });
    }

    // 🔥 OTP record
    const record = await Otp.findOne({ email }).sort({ createdAt: -1 });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    // 🔥 attempt limit
    if (record.attempts >= 3) {
      return res.status(429).json({
        success: false,
        message: "Too many attempts. Try again later"
      });
    }

    // 🔥 expiry check
    if (record.expiresAt < new Date()) {
      await Otp.deleteMany({ email });
      return res.status(400).json({
        success: false,
        message: "OTP expired"
      });
    }

    // 🔥 OTP match
    if (record.otp !== otp) {
      record.attempts += 1;
      await record.save();

      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    // 🔥 update password (direct UID)
    await admin.auth().updateUser(user.firebaseUid, {
      password: newPassword
    });

    // 🔥 revoke sessions (IMPORTANT)
    await admin.auth().revokeRefreshTokens(user.firebaseUid);

    // 🔥 delete OTP
    await Otp.deleteMany({ email });

    return res.status(200).json({
      success: true,
      message: "Password updated successfully ✅"
    });

  } catch (error) {
    console.error("❌ resetPassword error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};