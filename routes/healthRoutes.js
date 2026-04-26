// routes/healthRoutes.js

const express = require("express");
const router = express.Router();

const authMiddleware =
  require("../middlewares/authMiddleware");

const healthController =
  require("../controllers/healthController");

router.get(
  "/",
  authMiddleware,
  healthController.getHealthProfile
);

router.patch(
  "/",
  authMiddleware,
  healthController.updateHealthProfile
);

module.exports = router;