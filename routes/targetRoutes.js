const express = require("express");
const router = express.Router();

const authMiddleware =
  require("../middlewares/authMiddleware");

const targetController =
  require("../controllers/targetController");

router.get("/", authMiddleware, targetController.getTargets);
router.patch("/", authMiddleware, targetController.updateTargets);
router.post("/recalculate", authMiddleware, targetController.recalculateTargets);

module.exports = router;