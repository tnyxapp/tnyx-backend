// routes/airoutes.js
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const { aiAssistant } = require("../controllers/aiController");

router.post("/ask", authMiddleware, aiAssistant);

module.exports = router;