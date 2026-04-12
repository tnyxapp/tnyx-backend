// routes/logRoutes.js
const express = require("express");
const router = express.Router();

const auth = require("../middlewares/authMiddleware");

const { addFoodLog, getDailyFoodLogs, deleteFoodLog } = require("../controllers/foodController");
const { addWaterLog, getDailyWater } = require("../controllers/waterController");
const { addWeight } = require("../controllers/weightController");

// 🍽 Food
router.post("/food", auth, addFoodLog);
router.get("/food", auth, getDailyFoodLogs);
router.delete("/food/:id", auth, deleteFoodLog);

// 💧 Water
router.post("/water", auth, addWaterLog);
router.get("/water", auth, getDailyWater);

// ⚖️ Weight
router.post("/weight", auth, addWeight);

module.exports = router;