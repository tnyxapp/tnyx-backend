const Otp = require("../models/Otp");
const admin = require("../config/firebase");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");

// 🔒 blocked domains
const blockedDomains = ["tempmail", "mailinator", "10minutemail"];

// 🔥 helper
const hashOtp = (otp) =>
  crypto.createHash("sha256").update(otp).digest("hex");


// ✅ SEND OTP
exports.sendOtpService = async (email) => {

    // 🔥 sanitize
    email = email?.toLowerCase().trim();

    // 🔥 temp mail block
    const domain = email.split("@")[1] || "";
    if (blockedDomains.some(d => domain.includes(d))) {
        throw new Error("Disposable emails are not allowed");
    }

    // 🔥 Firebase user check
    if (type === "RESET_PASSWORD") {
    try {
        await admin.auth().getUserByEmail(email);
    } catch (err) {
        throw new Error("User not found");
    }

    // 🔥 deleted user block
    const user = await User.findOne({ email });
    if (user && user.isDeleted) {
        throw new Error("Account deleted. Please recover first");
    }
    } else if (type === "LINK_EMAIL") {
        // लिंक ईमेल: यह ईमेल किसी और के अकाउंट से जुड़ा नहीं होना चाहिए
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new Error("This email is already linked with another account");
        }
    }
    // 🔥 cooldown (30 sec)
    const lastOtp = await Otp.findOne({ email }).sort({ createdAt: -1 });

    if (
        lastOtp &&
        Date.now() - new Date(lastOtp.createdAt).getTime() < 30 * 1000
    ) {
        throw new Error("Wait 30 seconds before retry");
    }

    // 🔥 generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = hashOtp(otp);

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // 🔥 clear old
    await Otp.deleteMany({ email });

    // 🔥 save OTP
    await Otp.create({
        email,
        otp: hashedOtp,
        expiresAt,
        attempts: 0
    });

    // 🔥 send email (fail-safe)
    try {
        await sendEmail(email, otp);
    } catch (err) {
        await Otp.deleteMany({ email }); // rollback
        throw new Error("Failed to send OTP");
    }

    return { success: true, message: "OTP sent successfully ✅" };
};



// ✅ VERIFY OTP
exports.verifyOtpService = async (email, otp) => {

    email = email?.toLowerCase().trim();

    const record = await Otp.findOne({ email }).sort({ createdAt: -1 });

    if (!record) {
        throw new Error("Invalid OTP");
    }

    // 🔥 attempt limit
    if (record.attempts >= 3) {
        throw new Error("Too many attempts. Try again later");
    }

    // 🔥 expiry
    if (record.expiresAt < new Date()) {
        await Otp.deleteMany({ email });
        throw new Error("OTP expired");
    }

    // 🔥 match (hash compare)
    const hashedOtp = hashOtp(otp);

    if (record.otp !== hashedOtp) {
        record.attempts += 1;
        await record.save();
        throw new Error("Invalid OTP");
    }

    // 🔥 success
    await Otp.deleteMany({ email });

    return { success: true, message: "OTP verified ✅" };
};