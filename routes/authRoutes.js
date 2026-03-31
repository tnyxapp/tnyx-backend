const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

// ✅ Controllers को एक ही बार सही तरीके से इम्पोर्ट करें
const { signup, googleSync } = require("../controllers/signupController");
const { sendOtp, verifyOtp } = require("../controllers/otpController");
const { resetPassword } = require("../controllers/passwordController");

// ✅ OTP rate limit
const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  message: { message: "Too many OTP requests. Try again later" }
});

// ✅ Routes
router.post("/signup", signup);
router.post("/google-sync", googleSync);
router.post("/send-otp", otpLimiter, sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);
router.post("/check-user", checkUser);

module.exports = router;
