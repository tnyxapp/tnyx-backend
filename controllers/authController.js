const { signupService } = require("../services/authService");


// ✅ SIGNUP
exports.signup = async (req, res) => {
    try {
        let { email, password, name } = req.body;

        // 🔥 sanitize input
        email = email?.toLowerCase().trim();
        name = name?.trim();

        // 🔥 validation
        if (!email || !password || !name) {
            return res.status(400).json({
                success: false,
                message: "Email, password and name are required"
            });
        }

        if (!email.includes("@")) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            });
        }

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

        res.status(200).json(result);

    } catch (error) {

        let statusCode = 400;

        if (error.message.includes("deleted")) statusCode = 403;
        if (error.message.includes("exists")) statusCode = 409;

        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};



// ✅ GOOGLE SYNC (future ready)
exports.googleSync = async (req, res) => {
    try {

        // 🔥 future flow:
        // 1. verify firebase token
        // 2. check user in DB
        // 3. create/update

        res.status(200).json({
            success: true,
            message: "Google sync working"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};