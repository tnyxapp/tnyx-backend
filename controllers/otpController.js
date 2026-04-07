const { sendOtpService, verifyOtpService } = require("../services/otpService");


// ✅ SEND OTP
exports.sendOtp = async (req, res) => {
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

        const result = await sendOtpService(email);

        return res.status(200).json(result);

    } catch (error) {

        const statusCode =
            error.message.includes("Wait") ? 429 :
            error.message.includes("not allowed") ? 400 :
            400;

        return res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};


// ✅ VERIFY OTP
exports.verifyOtp = async (req, res) => {
    try {
        let { email, otp } = req.body;

        // 🔥 sanitize
        email = email?.toLowerCase().trim();

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required"
            });
        }

        // 🔥 OTP format check
        if (!/^\d{6}$/.test(otp)) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP format"
            });
        }

        const result = await verifyOtpService(email, otp);

        return res.status(200).json(result);

    } catch (error) {

        const statusCode =
            error.message.includes("Too many attempts") ? 429 :
            error.message.includes("expired") ? 400 :
            400;

        return res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};