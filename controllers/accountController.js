const { deleteAccountService, recoverAccountService } = require("../services/userService");


// ✅ DELETE ACCOUNT
exports.deleteAccount = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        // 🔥 validation
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const result = await deleteAccountService(token);

        res.status(200).json(result);

    } catch (error) {

        const statusCode =
            error.message.includes("Unauthorized") ? 401 :
            error.message.includes("not found") ? 404 :
            error.message.includes("already") ? 400 :
            400;

        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};



// ✅ RECOVER ACCOUNT
exports.recoverAccount = async (req, res) => {
    try {
        const { email } = req.body;

        // 🔥 validation
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        const result = await recoverAccountService(email);

        res.status(200).json(result);

    } catch (error) {

        const statusCode =
            error.message.includes("not found") ? 404 :
            error.message.includes("expired") ? 400 :
            error.message.includes("active") ? 400 :
            400;

        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};