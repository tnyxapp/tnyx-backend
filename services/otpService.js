// services/otpService.js
const supabase = require("../config/supabase"); // 🔥 Supabase Import
const admin = require("../config/firebase");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");

const blockedDomains = ["tempmail", "mailinator", "10minutemail", "yopmail", "guerrillamail"];
const hashOtp = (otp) => crypto.createHash("sha256").update(otp).digest("hex");

// ✅ SEND OTP
exports.sendOtpService = async (email, type) => {
    // 🚨 FIX 1: Strict Email Validation (Prevent Server Crash)
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        const err = new Error("Invalid email format");
        err.statusCode = 400;
        throw err;
    }

    email = email.toLowerCase().trim();

    // 🚨 FIX 2: Stronger Domain Blocking
    const domain = email.split("@")[1];
    // सिर्फ exact keywords को ब्लॉक करें ताकि असली डोमेन (जैसे my10minutemailbox.com) गलती से ब्लॉक न हों
    if (blockedDomains.some(d => domain.includes(d) || domain.endsWith(`${d}.com`))) {
        const err = new Error("Disposable emails are not allowed");
        err.statusCode = 400;
        throw err;
    }

    // ==========================================
    // 🔥 TYPE BASED VALIDATION
    // ==========================================
    // 🚨 FIX 3: Removed select('*') - Only fetch required fields
    const { data: existingUser } = await supabase
        .from('users')
        .select('id, is_deleted') 
        .eq('email', email)
        .maybeSingle();

    if (type === "SIGNUP") {
        if (existingUser) {
            const err = new Error("Email is already registered. Please login.");
            err.statusCode = 409;
            throw err;
        }
    } 
    else if (type === "RESET_PASSWORD") {
        if (!existingUser) {
            const err = new Error("User not found");
            err.statusCode = 404;
            throw err;
        }
        if (existingUser.is_deleted) {
            const err = new Error("Account deleted. Please recover first");
            err.statusCode = 403;
            throw err;
        }
        
        try { await admin.auth().getUserByEmail(email); } catch (err) { /* ignore */ }
    } 
    else if (type === "LINK_EMAIL") {
        if (existingUser) {
            const err = new Error("This email is already linked with another account");
            err.statusCode = 409;
            throw err;
        }
    } 
    else {
        const err = new Error("Invalid OTP type");
        err.statusCode = 400;
        throw err;
    }

    // 🔥 cooldown (30 sec)
    // 🚨 FIX 3 (Part 2): Fetch only 'created_at' instead of '*'
    const { data: lastOtp } = await supabase.from('otps')
        .select('created_at')
        .eq('email', email)
        .eq('type', type)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (lastOtp && Date.now() - new Date(lastOtp.created_at).getTime() < 30 * 1000) {
        const err = new Error("Wait 30 seconds before retrying");
        err.statusCode = 429; // Too Many Requests
        throw err;
    }

    // 🔥 generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = hashOtp(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    // 🔥 clear old OTPs of same type for this email
    await supabase.from('otps').delete().eq('email', email).eq('type', type);

    // 🔥 save OTP with TYPE
    const { error: insertError } = await supabase.from('otps').insert([{
        email: email,
        type: type,
        otp: hashedOtp,
        expires_at: expiresAt,
        attempts: 0
    }]);

    if (insertError) {
        throw new Error("Failed to generate OTP. Please try again.");
    }

    // 🔥 send email
    try {
        await sendEmail(email, otp);
    } catch (err) {
        await supabase.from('otps').delete().eq('email', email).eq('type', type); 
        const error = new Error("Failed to send OTP email");
        error.statusCode = 500;
        throw error;
    }

    return { success: true, message: `OTP sent successfully for ${type} ✅` };
};

// ✅ VERIFY OTP
exports.verifyOtpService = async (email, otp, type) => {
    if (!email || !otp || !type) {
        const err = new Error("Email, OTP and type are required");
        err.statusCode = 400;
        throw err;
    }

    email = email.toLowerCase().trim();

    // 👉 Find latest OTP for this specific type
    // 🚨 FIX 3 (Part 3): Select only required fields
    const { data: record, error: fetchError } = await supabase.from('otps')
        .select('id, type, attempts, expires_at, otp')
        .eq('email', email)
        .eq('type', type)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (fetchError || !record) {
        const err = new Error("Invalid OTP or request expired");
        err.statusCode = 400;
        throw err;
    }

    // 🔥 SECURITY: Cross-OTP Abuse Check
    if (record.type !== type) {
        const err = new Error("Invalid OTP request type");
        err.statusCode = 400;
        throw err;
    }

    if (record.attempts >= 3) {
        const err = new Error("Too many attempts. Try again later");
        err.statusCode = 429;
        throw err;
    }

    if (new Date(record.expires_at) < new Date()) {
        await supabase.from('otps').delete().eq('email', email).eq('type', type);
        const err = new Error("OTP expired");
        err.statusCode = 400;
        throw err;
    }

    const hashedOtp = hashOtp(otp);

    if (record.otp !== hashedOtp) {
        await supabase.from('otps').update({ attempts: record.attempts + 1 }).eq('id', record.id);
        const err = new Error("Invalid OTP code");
        err.statusCode = 400;
        throw err;
    }

    // 🔥 success - delete used OTP
    await supabase.from('otps').delete().eq('email', email).eq('type', type);

    return { success: true, message: "OTP verified successfully ✅" };
};
