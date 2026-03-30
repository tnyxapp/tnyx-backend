const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

// ✅ Controllers को उनकी नई फाइल्स से इम्पोर्ट करें
const { signup } = require("../controllers/signupController");
const { sendOtp, verifyOtp } = require("../controllers/otpController");
const { resetPassword } = require("../controllers/passwordController");
const { signup, googleSync } = require("../controllers/signupController");

// ✅ OTP rate limit (5 min में max 3 requests)
const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  message: { message: "Too many OTP requests. Try again later" }
});

// ✅ Routes - अब ये सही फंक्शन्स को कॉल करेंगे
router.post("/signup", signup);
router.post("/send-otp", otpLimiter, sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);
router.post("/signup", signup);
router.post("/google-sync", googleSync);

module.exports = router;
