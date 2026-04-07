const { signupService } = require("../services/authService");


// ✅ SIGNUP
exports.signup = async (req, res) => {
    try {
        let { email, password, name } = req.body;

        // 🔥 sanitize
        email = email?.toLowerCase().trim();
        name = name?.trim();

        // 🔥 validation
        if (!email || !password || !name) {
            return res.status(400).json({
                success: false,
                message: "Email, password and name are required"
            });
        }

        // 🔥 email format check
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            });
        }

        // 🔥 password check
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters"
            });
        }

        const result = await signupService({
            ...req.body,
            email,
            name
        });

        return res.status(201).json(result);

    } catch (error) {

        // 🔥 better status handling
        let statusCode = 400;

        if (error.message.includes("deleted")) statusCode = 403;
        if (error.message.includes("exists")) statusCode = 409;

        return res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};


// ✅ GOOGLE SYNC
exports.googleSync = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            message: "Google sync working"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};