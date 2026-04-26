// routes/userRoutes.js
const express = require("express");
const router = express.Router();

const authMiddleware =
  require("../middlewares/authMiddleware");

const {
  getProfile,
  updateProfile,
  uploadProfileImage
} = require("../controllers/userController");

// profile
router.get(
  "/profile",
  authMiddleware,
  getProfile
);

router.patch(
  "/profile",
  authMiddleware,
  updateProfile
);

// image
router.patch(
  "/profile-image",
  authMiddleware,
  uploadProfileImage
);

module.exports = router;