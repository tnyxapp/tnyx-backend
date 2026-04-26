// routes/workoutRoutes.js
const express = require("express");
const router = express.Router();

const authMiddleware =
  require("../middlewares/authMiddleware");

const workoutController =
  require("../controllers/workoutController");

router.get(
  "/",
  authMiddleware,
  workoutController.getWorkoutProfile
);

router.patch(
  "/",
  authMiddleware,
  workoutController.updateWorkoutProfile
);

module.exports = router;