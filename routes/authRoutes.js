const express = require("express");
const router = express.Router();

// सभी फंक्शन्स को इम्पोर्ट कर लिया
const {
  signup,
  sendOtp,
  verifyOtp,
  resetPassword
} = require("../controllers/authController");

// सारे राउट्स यहाँ हैं
router.post("/signup", signup);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

module.exports = router;
