const express = require("express");
const router = express.Router();

// 🔥 signup फंक्शन को भी controller से इम्पोर्ट करें
const {
  signup, // ध्यान दें: अगर आपके controller में इसका नाम 'register' है, तो यहाँ register लिखें
  sendOtp,
  verifyOtp,
  resetPassword
} = require("../controllers/authController");

// 🔥 यह रहा आपका नया Signup राउट
router.post("/signup", signup); 

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

module.exports = router;
