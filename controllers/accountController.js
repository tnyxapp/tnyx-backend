// controllers/accountController.js
const { deleteAccountService, recoverAccountService } = require("../services/userService");

// ✅ DELETE ACCOUNT
exports.deleteAccount = async (req, res) => {
    try {
        // 🔥 middleware से UID (Supabase के लिए अपडेटेड)
        const uid = req.user.firebase_uid || req.user.uid;

        const result = await deleteAccountService(uid);

        return res.status(200).json(result);

    } catch (error) {
        const statusCode =
            error.message.includes("Unauthorized") ? 401 :
            error.message.includes("not found") ? 404 :
            error.message.includes("already") ? 400 :
            400;

        return res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};

// ✅ RECOVER ACCOUNT
exports.recoverAccount = async (req, res) => {
    try {
        let { email } = req.body;

        // 🔥 sanitize
        email = email?.toLowerCase().trim();

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        const result = await recoverAccountService(email);

        return res.status(200).json(result);

    } catch (error) {
        const statusCode =
            error.message.includes("not found") ? 404 :
            error.message.includes("expired") ? 400 :
            error.message.includes("active") ? 400 :
            400;

        return res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};