// services/otpService.js
const supabase = require("../config/supabase"); // 🔥 Supabase Import
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
    const { data: existingUser } = await supabase.from('users').select('*').eq('email', email).maybeSingle();

    if (type === "SIGNUP") {
        if (existingUser) throw new Error("Email is already registered. Please login.");
    } 
    else if (type === "RESET_PASSWORD") {
        if (!existingUser) throw new Error("User not found");
        if (existingUser.is_deleted) throw new Error("Account deleted. Please recover first");
        
        try { await admin.auth().getUserByEmail(email); } catch (err) { /* ignore */ }
    } 
    else if (type === "LINK_EMAIL") {
        if (existingUser) throw new Error("This email is already linked with another account");
    } 
    else {
        throw new Error("Invalid OTP type");
    }

    // 🔥 cooldown (30 sec)
    const { data: lastOtp } = await supabase.from('otps')
        .select('*')
        .eq('email', email)
        .eq('type', type)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (lastOtp && Date.now() - new Date(lastOtp.created_at).getTime() < 30 * 1000) {
        throw new Error("Wait 30 seconds before retrying");
    }

    // 🔥 generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = hashOtp(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    // 🔥 clear old OTPs of same type for this email
    await supabase.from('otps').delete().eq('email', email).eq('type', type);

    // 🔥 save OTP with TYPE
    await supabase.from('otps').insert([{
        email: email,
        type: type,
        otp: hashedOtp,
        expires_at: expiresAt,
        attempts: 0
    }]);

    // 🔥 send email
    try {
        await sendEmail(email, otp);
    } catch (err) {
        await supabase.from('otps').delete().eq('email', email).eq('type', type); 
        throw new Error("Failed to send OTP email");
    }

    return { success: true, message: `OTP sent successfully for ${type} ✅` };
};

// ✅ VERIFY OTP
exports.verifyOtpService = async (email, otp, type) => {
    email = email?.toLowerCase().trim();

    // 👉 Find latest OTP for this specific type
    const { data: record } = await supabase.from('otps')
        .select('*')
        .eq('email', email)
        .eq('type', type)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!record) throw new Error("Invalid OTP or request expired");

    // 🔥 SECURITY: Cross-OTP Abuse Check
    if (record.type !== type) {
        throw new Error("Invalid OTP request type");
    }

    if (record.attempts >= 3) {
        throw new Error("Too many attempts. Try again later");
    }

    if (new Date(record.expires_at) < new Date()) {
        await supabase.from('otps').delete().eq('email', email).eq('type', type);
        throw new Error("OTP expired");
    }

    const hashedOtp = hashOtp(otp);

    if (record.otp !== hashedOtp) {
        await supabase.from('otps').update({ attempts: record.attempts + 1 }).eq('id', record.id);
        throw new Error("Invalid OTP code");
    }

    // 🔥 success - delete used OTP
    await supabase.from('otps').delete().eq('email', email).eq('type', type);

    return { success: true, message: "OTP verified successfully ✅" };
};