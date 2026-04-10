const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

// ✅ controllers
const { signup, googleSync, truecallerLogin } = require("../controllers/authController");
const { deleteAccount, recoverAccount } = require("../controllers/accountController");
const { sendOtp, verifyOtp, linkEmail } = require("../controllers/otpController");
const { resetPassword } = require("../controllers/passwordController");
const { checkUser } = require("../controllers/checkUser");
const { activateTrial } = require("../controllers/trialController"); // 🔥 Trial Controller

// ✅ middleware (सिर्फ तुम्हारा असली मिडलवेयर रखा है)
const authMiddleware = require("../middlewares/authMiddleware");

// 🔥 OTP rate limit
const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: "Too many OTP requests. Try again later"
  }
});

// 🔥 general rate limit
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100
});

// ================= ROUTES =================

// 🔓 public routes
router.post("/signup", generalLimiter, signup);
router.post("/truecaller-login", truecallerLogin);

// 🔐 Google sync
router.post("/google-sync", authMiddleware, googleSync);

// 🔐 OTP routes
router.post("/send-otp", otpLimiter, sendOtp);
router.post("/verify-otp", otpLimiter, verifyOtp); // 🔥 FIX: verify OTP limiter add
router.post("/reset-password", otpLimiter, resetPassword);

// ⚠️ recover (temporary for testing)
router.post("/recover-account", otpLimiter, recoverAccount);

// 🔒 protected routes (लॉगिन के बाद वाले)
router.post("/check-user", authMiddleware, checkUser);
router.post("/delete-account", authMiddleware, deleteAccount);
router.post("/link-email", authMiddleware, otpLimiter, linkEmail);

// 🔥 TRIAL ROUTE (Frontend URL: /api/auth/activate)
router.post("/activate", authMiddleware, activateTrial);

module.exports = router;