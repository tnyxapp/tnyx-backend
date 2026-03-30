const Otp = require("../models/Otp");
const admin = require("../config/firebase");
const sendEmail = require("../utils/sendEmail");

// 🚀 1. SIGNUP NEW USER
exports.signup = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: "Email, password and name are required"
      });
    }

    if (!email.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "Valid email required"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters"
      });
    }

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    res.status(201).json({ 
      success: true, 
      message: "User registered successfully ✅",
      uid: userRecord.uid
    });

  } catch (error) {
    console.error("❌ ERROR in signup:", error);
    res.status(400).json({ 
      success: false,
      message: error.message || "Error creating user" 
    });
  }
};


// 🚀 2. SEND OTP
exports.sendOtp = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email required" });
  }

  try {
    try {
      await admin.auth().getUserByEmail(email);
    } catch {
      return res.status(400).json({ message: "User not found. Please signup first" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await Otp.deleteMany({ email });
    await Otp.create({ email, otp, expiresAt });

    await sendEmail(email, otp);

    res.json({ message: "OTP sent to email ✅" });

  } catch (error) {
    console.error("❌ ERROR in sendOtp:", error);
    res.status(500).json({ message: "Error sending OTP", error: error.message });
  }
};


// 🚀 3. VERIFY OTP
exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  // ✅ validation
  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  try {
    const record = await Otp.findOne({ email }).sort({ createdAt: -1 });

    if (!record) return res.status(400).json({ message: "OTP not found" });
    if (record.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });
    if (record.expiresAt < new Date()) return res.status(400).json({ message: "OTP expired" });

    res.json({ message: "OTP verified ✅" });

  } catch {
    res.status(500).json({ message: "Error verifying OTP" });
  }
};


// 🚀 4. RESET PASSWORD
exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  // ✅ validation
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: "Email, OTP and new password are required" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  try {
    const record = await Otp.findOne({ email }).sort({ createdAt: -1 });

    if (!record) return res.status(400).json({ message: "OTP not found" });
    if (record.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });
    if (record.expiresAt < new Date()) return res.status(400).json({ message: "OTP expired" });

    let user;
    try {
      user = await admin.auth().getUserByEmail(email);
    } catch {
      return res.status(400).json({ message: "User not found. Please signup first" });
    }

    await admin.auth().updateUser(user.uid, { password: newPassword });

    await Otp.deleteMany({ email });

    res.json({ message: "Password updated successfully ✅" });

  } catch {
    res.status(500).json({ message: "Error updating password" });
  }
};
