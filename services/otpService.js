const Otp = require("../models/Otp");
const admin = require("../config/firebase");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");

// 🔒 blocked temp domains
const blockedDomains = ["tempmail.com", "mailinator.com", "10minutemail.com"];


// ✅ SEND OTP
exports.sendOtpService = async (email) => {

    // 🔥 1. temp mail block
    const domain = email.split("@")[1];
    if (blockedDomains.includes(domain)) {
        throw new Error("Disposable emails are not allowed");
    }

    // 🔥 2. Firebase user check
    await admin.auth().getUserByEmail(email);

    // 🔥 3. deleted user block
    const user = await User.findOne({ email });
    if (user && user.isDeleted) {
        throw new Error("Account deleted. Please recover first");
    }

    // 🔥 4. resend cooldown (30 sec)
    const lastOtp = await Otp.findOne({ email }).sort({ createdAt: -1 });

    if (lastOtp && Date.now() - new Date(lastOtp.createdAt).getTime() < 30 * 1000) {
        throw new Error("Wait 30 seconds before retry");
    }

    // 🔥 5. generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // 🔥 6. clear old OTP
    await Otp.deleteMany({ email });

    // 🔥 7. save new OTP
    await Otp.create({
        email,
        otp,
        expiresAt,
        attempts: 0
    });

    // 🔥 8. send email
    await sendEmail(email, otp);

    return { success: true, message: "OTP sent successfully ✅" };
};



// ✅ VERIFY OTP
exports.verifyOtpService = async (email, otp) => {

    const record = await Otp.findOne({ email }).sort({ createdAt: -1 });

    if (!record) {
        throw new Error("Invalid OTP");
    }

    // 🔥 1. attempt limit
    if (record.attempts >= 3) {
        throw new Error("Too many attempts. Try again later");
    }

    // 🔥 2. expiry check
    if (record.expiresAt < new Date()) {
        await Otp.deleteMany({ email });
        throw new Error("OTP expired");
    }

    // 🔥 3. wrong OTP
    if (record.otp !== otp) {
        record.attempts += 1;
        await record.save();
        throw new Error("Invalid OTP");
    }

    // 🔥 4. success → delete OTP
    await Otp.deleteMany({ email });

    return { success: true, message: "OTP verified ✅" };
};