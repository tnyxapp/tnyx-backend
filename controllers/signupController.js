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

        const result = await signupService({
            ...req.body,
            email,
            name
        });

        res.status(200).json(result);

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};


// ✅ GOOGLE SYNC
exports.googleSync = async (req, res) => {
    res.status(200).json({
        success: true,
        message: "Google sync working"
    });
};