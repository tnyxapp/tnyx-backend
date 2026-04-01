const admin = require("../config/firebase");
const Otp = require("../models/Otp");

exports.resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    try {
        const record = await Otp.findOne({ email, otp });
        if (!record) return res.status(400).json({ message: "Invalid request" });

        const user = await admin.auth().getUserByEmail(email);
        await admin.auth().updateUser(user.uid, { password: newPassword });
        await Otp.deleteMany({ email });

        res.json({ success: true, message: "Password updated ✅" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
