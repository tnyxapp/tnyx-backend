const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

// ✅ controllers
const { signup, googleSync, truecallerLogin } = require("../controllers/authController");
const { deleteAccount, recoverAccount } = require("../controllers/accountController");
const { sendOtp, verifyOtp, linkEmail } = require("../controllers/otpController");
const { resetPassword } = require("../controllers/passwordController");
const { checkUser } = require("../controllers/checkUser");

// 🔥 Trial Controller (FIXED: Imported startFreeTrial)
const { startFreeTrial } = require("../controllers/userController"); // या trialController.js जहाँ भी तुमने इसे रखा है

// ✅ middleware
const authMiddleware = require("../middlewares/authMiddleware");

// 🔥 OTP rate limit (5 mins, max 3 requests)
const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: "Too many OTP requests. Try again later"
  }
});

// 🔥 general rate limit (1 min, max 100 requests)
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
router.post("/verify-otp", otpLimiter, verifyOtp);
router.post("/reset-password", otpLimiter, resetPassword);

// ⚠️ recover (temporary for testing)
router.post("/recover-account", otpLimiter, recoverAccount);

// 🔒 protected routes (लॉगिन के बाद वाले)
router.post("/check-user", authMiddleware, checkUser);
router.post("/delete-account", authMiddleware, deleteAccount);
router.post("/link-email", authMiddleware, otpLimiter, linkEmail);

// 🔥 TRIAL ROUTE (Frontend URL: /api/auth/start-trial)
router.post('/start-trial', authMiddleware, startFreeTrial);

module.exports = router;