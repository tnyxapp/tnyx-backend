const express = require("express");
const router = express.Router();

const rateLimit = require("express-rate-limit");

// ✅ OTP rate limit (5 min में max 3 requests)
const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  message: "Too many OTP requests. Try again later"
});

// सभी फंक्शन्स को इम्पोर्ट कर लिया
const {
  signup,
  sendOtp,
  verifyOtp,
  resetPassword
} = require("../controllers/authController");

// routes
router.post("/signup", signup);
router.post("/send-otp", otpLimiter, sendOtp); // 🔥 limiter add
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

module.exports = router;
