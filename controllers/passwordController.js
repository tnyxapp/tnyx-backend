const admin = require("../config/firebase");
const Otp = require("../models/Otp");
const User = require("../models/User");

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // 🔥 1. validation
    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters"
      });
    }

    // 🔥 2. user check
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

    // 🔥 3. OTP record
    const record = await Otp.findOne({ email }).sort({ createdAt: -1 });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    // 🔥 4. attempt limit
    if (record.attempts >= 3) {
      return res.status(429).json({
        success: false,
        message: "Too many attempts. Try again later"
      });
    }

    // 🔥 5. expiry check
    if (record.expiresAt < new Date()) {
      await Otp.deleteMany({ email });
      return res.status(400).json({
        success: false,
        message: "OTP expired"
      });
    }

    // 🔥 6. OTP match (अगर hash use कर रहे हो तो bcrypt.compare)
    if (record.otp !== otp) {
      record.attempts += 1;
      await record.save();

      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    // 🔥 7. update password
    const firebaseUser = await admin.auth().getUserByEmail(email);

    await admin.auth().updateUser(firebaseUser.uid, {
      password: newPassword
    });

    // 🔥 8. delete OTP
    await Otp.deleteMany({ email });

    res.json({
      success: true,
      message: "Password updated successfully ✅"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};