const express = require("express");
const router = express.Router();

const signupController = require("../controllers/signupController");
const otpController = require("../controllers/otpController");
const passwordController = require("../controllers/passwordController");

// Routes
router.post("/signup", signupController.signup);
router.post("/send-otp", otpController.sendOtp);
router.post("/verify-otp", otpController.verifyOtp);
router.post("/reset-password", passwordController.resetPassword);

module.exports = router;
