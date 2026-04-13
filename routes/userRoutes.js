// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware'); // ✅ सही मिडलवेयर इम्पोर्ट किया

// 🔥 PATCH रिक्वेस्ट (क्योंकि हम डायनामिक डेटा अपडेट कर रहे हैं)
router.patch('/update-profile', authMiddleware, userController.updateProfile);

module.exports = router;
