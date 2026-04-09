const Otp = require("../models/Otp");
const User = require("../models/User");
const admin = require("../config/firebase");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");

const blockedDomains = ["tempmail", "mailinator", "10minutemail"];
const hashOtp = (otp) => crypto.createHash("sha256").update(otp).digest("hex");

// ✅ SEND OTP
exports.sendOtpService = async (email, type) => {
    email = email?.toLowerCase().trim();

    // 🔥 temp mail block
    const domain = email.split("@")[1] || "";
    if (blockedDomains.some(d => domain.includes(d))) {
        throw new Error("Disposable emails are not allowed");
    }

    // ==========================================
    // 🔥 TYPE BASED VALIDATION (The Pro Logic)
    // ==========================================
    const existingUser = await User.findOne({ email });

    if (type === "SIGNUP") {
        if (existingUser) throw new Error("Email is already registered. Please login.");
    } 
    else if (type === "RESET_PASSWORD") {
        if (!existingUser) throw new Error("User not found");
        if (existingUser.isDeleted) throw new Error("Account deleted. Please recover first");
        
        // Optional Firebase check if email login is used
        try { await admin.auth().getUserByEmail(email); } catch (err) { /* ignore or handle */ }
    } 
    else if (type === "LINK_EMAIL") {
        if (existingUser) throw new Error("This email is already linked with another account");
    } 
    else {
        throw new Error("Invalid OTP type");
    }

    // 🔥 cooldown (30 sec)
    const lastOtp = await Otp.findOne({ email, type }).sort({ createdAt: -1 });
    if (lastOtp && Date.now() - new Date(lastOtp.createdAt).getTime() < 30 * 1000) {
        throw new Error("Wait 30 seconds before retrying");
    }

    // 🔥 generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = hashOtp(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    // 🔥 clear old OTPs of same type for this email
    await Otp.deleteMany({ email, type });

    // 🔥 save OTP with TYPE
    await Otp.create({
        email,
        type, // 👉 Saved in DB
        otp: hashedOtp,
        expiresAt,
        attempts: 0
    });

    // 🔥 send email
    try {
        await sendEmail(email, otp);
    } catch (err) {
        await Otp.deleteMany({ email, type }); 
        throw new Error("Failed to send OTP email");
    }

    return { success: true, message: `OTP sent successfully for ${type} ✅` };
};

// ✅ VERIFY OTP
exports.verifyOtpService = async (email, otp, type) => {
    email = email?.toLowerCase().trim();

    // 👉 Find latest OTP for this specific type
    const record = await Otp.findOne({ email, type }).sort({ createdAt: -1 });

    if (!record) throw new Error("Invalid OTP or request expired");

    // 🔥 SECURITY: Cross-OTP Abuse Check
    if (record.type !== type) {
        throw new Error("Invalid OTP request type");
    }

    if (record.attempts >= 3) {
        throw new Error("Too many attempts. Try again later");
    }

    if (record.expiresAt < new Date()) {
        await Otp.deleteMany({ email, type });
        throw new Error("OTP expired");
    }

    const hashedOtp = hashOtp(otp);

    if (record.otp !== hashedOtp) {
        record.attempts += 1;
        await record.save();
        throw new Error("Invalid OTP code");
    }

    // 🔥 success - delete used OTP
    await Otp.deleteMany({ email, type });

    return { success: true, message: "OTP verified successfully ✅" };
};