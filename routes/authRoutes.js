const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

// ✅ controllers
const { signup, googleSync } = require("../controllers/authController");
const { deleteAccount, recoverAccount } = require("../controllers/accountController");
const { sendOtp, verifyOtp } = require("../controllers/otpController");
const { resetPassword } = require("../controllers/passwordController");
const { checkUser } = require("../controllers/checkUser");

// ✅ middleware (next step)
const authMiddleware = require("../middlewares/authMiddleware");


// 🔥 OTP rate limit
const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  message: { success: false, message: "Too many OTP requests. Try again later" }
});


// 🔥 general rate limit (optional pro)
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100
});


// ================= ROUTES =================

// 🔓 public routes
router.post("/signup", generalLimiter, signup);
router.post("/google-sync", generalLimiter, googleSync);

router.post("/send-otp", otpLimiter, sendOtp);
router.post("/verify-otp", verifyOtp);

router.post("/reset-password", otpLimiter, resetPassword);
router.post("/recover-account", otpLimiter, recoverAccount);


// 🔒 protected routes (token required)
router.post("/check-user", authMiddleware, checkUser);
router.post("/delete-account", authMiddleware, deleteAccount);


module.exports = router;