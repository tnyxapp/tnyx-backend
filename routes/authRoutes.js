const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const { signup, googleSync, deleteAccount, recoverAccount } = require("../controllers/signupController");
const { sendOtp, verifyOtp } = require("../controllers/otpController");
const { resetPassword } = require("../controllers/passwordController");
const { checkUser } = require("../controllers/checkUser");

const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  message: { message: "Too many OTP requests. Try again later" }
});

router.post("/signup", signup);
router.post("/google-sync", googleSync);
router.post("/send-otp", otpLimiter, sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);
router.post("/check-user", checkUser);
router.post("/delete-account", deleteAccount);
router.post("/recover-account", recoverAccount);

module.exports = router;
