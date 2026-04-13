//routes/authRoutes.js
const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { calculateTargetsController } = require("../controllers/targetController");

// ✅ controllers
const { signup, googleSync, truecallerLogin } = require("../controllers/authController");
const { deleteAccount, recoverAccount } = require("../controllers/accountController");
const { sendOtp, verifyOtp, linkEmail } = require("../controllers/otpController");
const { resetPassword } = require("../controllers/passwordController");
const { checkUser } = require("../controllers/checkUser");
const { uploadProfileImage } = require("../controllers/imageController");

// 🔥 Trial Controller
const { startFreeTrial } = require("../controllers/userController");

// ✅ middleware
const authMiddleware = require("../middlewares/authMiddleware");
const upload = require("../middlewares/multerMiddleware");

// 🔥 OTP rate limit
const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  message: { success: false, message: "Too many OTP requests. Try again later" }
});

// 🔥 general rate limit
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100
});

// ================= ROUTES =================

// 🔓 public routes
router.post("/signup", generalLimiter, signup);
router.post("/truecaller-login", truecallerLogin);
router.post("/google-sync", generalLimiter, googleSync);

// 🔐 OTP routes
router.post("/send-otp", otpLimiter, sendOtp);
router.post("/verify-otp", otpLimiter, verifyOtp);
router.post("/reset-password", otpLimiter, resetPassword);
router.post("/recover-account", otpLimiter, recoverAccount); // testing

// 🔒 protected routes
router.post("/check-user", authMiddleware, checkUser);
router.post("/delete-account", authMiddleware, deleteAccount);
router.post("/link-email", authMiddleware, otpLimiter, linkEmail);

// 🔥 TRIAL ROUTE
router.post('/start-trial', authMiddleware, startFreeTrial);

// 🔥 IMAGE UPLOAD
router.post("/upload-profile", authMiddleware, upload.single("image"), uploadProfileImage);
  
// 🔥 TARGETS
router.post("/calculate-targets", authMiddleware, calculateTargetsController);

module.exports = router;
