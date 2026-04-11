// controllers/signupController.js
const { signupService } = require("../services/signupService"); // 🔥 Path check कर लेना (authService.js या signupService.js)

// ✅ EMAIL SIGNUP
exports.signup = async (req, res) => {
    try {
        let { email, password, name } = req.body;

        // 🔥 sanitize
        email = email?.toLowerCase().trim();
        name = name?.trim();

        // 🔥 validation
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email, password are required" });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, message: "Invalid email format" });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
        }

        const result = await signupService({
            ...req.body,
            email,
            name,
            authProvider: "email" // 🔥 Explicitly provider बता रहे हैं
        });

        return res.status(201).json(result);

    } catch (error) {
        let statusCode = 400;
        if (error.message.includes("deleted")) statusCode = 403;
        if (error.message.includes("exists")) statusCode = 409;

        return res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};


// ✅ GOOGLE SYNC (Dummy मैसेज हटा दिया गया है!)
exports.googleSync = async (req, res) => {
    try {
        const { email, firebaseUid, name } = req.body;

        // 🔥 validation
        if (!email || !firebaseUid) {
            return res.status(400).json({ 
                success: false, 
                message: "Email and Firebase UID are required for Google Sync" 
            });
        }

        // सीधा हमारे मास्टर सर्विस को कॉल करें
        const result = await signupService({
            ...req.body, // इसमें photoURL, deviceId, referral सब आ जाएगा
            email: email.toLowerCase().trim(),
            name: name?.trim(),
            authProvider: "google" // 🔥 Provider Google सेट किया
        });

        // 200 OK (क्योंकि यह Login/Sync दोनों का काम करता है)
        return res.status(200).json(result);

    } catch (error) {
        let statusCode = 400;
        if (error.message.includes("deleted")) statusCode = 403;
        if (error.message.includes("linked")) statusCode = 409;

        return res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};