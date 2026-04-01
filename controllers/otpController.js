const { sendOtpService, verifyOtpService } = require("../services/otpService");


// ✅ SEND OTP
exports.sendOtp = async (req, res) => {
    try {
        const { email } = req.body;

        // 🔥 validation
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        const result = await sendOtpService(email);

        res.status(200).json(result);

    } catch (error) {

        // 🔥 better status handling
        const statusCode =
            error.message.includes("Wait") ? 429 :
            error.message.includes("not allowed") ? 400 :
            400;

        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};



// ✅ VERIFY OTP
exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        // 🔥 validation
        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required"
            });
        }

        const result = await verifyOtpService(email, otp);

        res.status(200).json(result);

    } catch (error) {

        const statusCode =
            error.message.includes("Too many attempts") ? 429 :
            error.message.includes("expired") ? 400 :
            400;

        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};