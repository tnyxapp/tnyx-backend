const Otp = require("../models/Otp");
const admin = require("../config/firebase");
const sendEmail = require("../utils/sendEmail");

// SEND OTP
exports.sendOtp = async (req, res) => {
  const { email } = req.body;
  console.log("👉 1. Request received for email:", email);

  if (!email) {
    return res.status(400).json({ message: "Email required" });
  }

  try {
    // ✅ user existence check (IMPORTANT)
    try {
      await admin.auth().getUserByEmail(email);
    } catch {
      return res.status(400).json({
        message: "User not found. Please signup first",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    console.log("⏳ 2. Saving OTP to database...");
    await Otp.deleteMany({ email });
    await Otp.create({ email, otp, expiresAt });
    console.log("✅ 3. OTP saved to database successfully!");

    console.log("⏳ 4. Sending email via Nodemailer...");
    await sendEmail(email, otp);
    console.log("✅ 5. Email sent successfully!");

    res.json({ message: "OTP sent to email ✅" });

  } catch (error) {
    console.error("❌ ERROR in sendOtp:", error);
    res.status(500).json({ message: "Error sending OTP", error: error.message });
  }
};


// VERIFY OTP
exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

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


// RESET PASSWORD
exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

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

    await admin.auth().updateUser(user.uid, {
      password: newPassword
    });

    await Otp.deleteMany({ email });

    res.json({ message: "Password updated successfully ✅" });

  } catch {
    res.status(500).json({ message: "Error updating password" });
  }
};
