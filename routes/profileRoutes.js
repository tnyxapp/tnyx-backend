// profileRoutes.js
const express = require("express");
const router = express.Router();

const authMiddleware =
  require("../middlewares/authMiddleware");

const profileController =
  require("../controllers/profileController");

router.get(
  "/",
  authMiddleware,
  profileController.getProfile
);

router.patch(
  "/",
  authMiddleware,
  profileController.updateProfile
);

router.patch(
  "/image",
  authMiddleware,
  profileController.uploadProfileImage
);

module.exports = router;