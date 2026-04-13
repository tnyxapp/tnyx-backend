// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middlewares/authMiddleware'); // आपका Firebase Token चेक करने वाला मिडलवेयर

// 🔥 PATCH रिक्वेस्ट का इस्तेमाल करें (क्योंकि हम सिर्फ कुछ डेटा बदल रहे हैं)
router.patch('/update-profile', verifyToken, userController.updateProfile);

module.exports = router;
