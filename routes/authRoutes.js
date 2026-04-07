const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

// ✅ controllers
const { signup, googleSync } = require("../controllers/authController");
const { deleteAccount, recoverAccount } = require("../controllers/accountController");
const { sendOtp, verifyOtp } = require("../controllers/otpController");
const { resetPassword } = require("../controllers/passwordController");
const { checkUser } = require("../controllers/checkUser");

// ✅ middleware
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

// 🔐 Google sync (better secure)
router.post("/google-sync", authMiddleware, googleSync);

// 🔐 OTP routes
router.post("/send-otp", otpLimiter, sendOtp);

// 🔥 FIX: verify OTP limiter add
router.post("/verify-otp", otpLimiter, verifyOtp);

// 🔐 password reset
router.post("/reset-password", otpLimiter, resetPassword);

// ⚠️ recover (temporary for testing)
router.post("/recover-account", otpLimiter, recoverAccount);


// 🔒 protected routes
router.post("/check-user", authMiddleware, checkUser);
router.post("/delete-account", authMiddleware, deleteAccount);


module.exports = router;