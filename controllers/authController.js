const { signupService } = require("../services/authService");

const TRUECALLER_CLIENT_ID = process.env.TRUECALLER_CLIENT_ID || "vkz0cfioqdao-o7h-ypzcrqdtqp24dcqszgg9wwe0fm";
const TRUECALLER_TOKEN_URL = "https://oauth-account-noneu.truecaller.com/v1/token";
const TRUECALLER_USERINFO_URL = "https://oauth-account-noneu.truecaller.com/v1/userinfo";

const readJsonResponse = async (response) => {
    const text = await response.text();
    if (!text) return {};

    try {
        return JSON.parse(text);
    } catch (error) {
        return { message: text };
    }
};

const normalizeMobile = (mobile) => {
    const digits = String(mobile || "").replace(/\D/g, "");

    if (digits.length > 10 && digits.startsWith("91")) {
        return digits.slice(-10);
    }

    return digits;
};

const fetchTruecallerProfile = async ({ authorizationCode, codeVerifier }) => {
    if (!authorizationCode || !codeVerifier) {
        throw new Error("Truecaller authorization code and code verifier are required");
    }

    if (typeof fetch !== "function") {
        throw new Error("Server fetch API is not available. Please use Node.js 18 or newer.");
    }

    const tokenParams = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: TRUECALLER_CLIENT_ID,
        code: authorizationCode,
        code_verifier: codeVerifier
    });

    const tokenResponse = await fetch(TRUECALLER_TOKEN_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: tokenParams
    });

    const tokenBody = await readJsonResponse(tokenResponse);
    if (!tokenResponse.ok || !tokenBody.access_token) {
        throw new Error(tokenBody.error_description || tokenBody.message || tokenBody.error || "Truecaller token fetch failed");
    }

    const profileResponse = await fetch(TRUECALLER_USERINFO_URL, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${tokenBody.access_token}`
        }
    });

    const profileBody = await readJsonResponse(profileResponse);
    if (!profileResponse.ok) {
        throw new Error(profileBody.error_description || profileBody.message || profileBody.error || "Truecaller profile fetch failed");
    }

    return profileBody;
};

// SIGNUP
exports.signup = async (req, res) => {
    try {
        let { email, password, name } = req.body;

        email = email?.toLowerCase().trim();
        name = name?.trim();

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email, password are required"
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;

        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                success: false,
                message: "Password must have at least 6 characters, including 1 uppercase, 1 lowercase, 1 number and 1 special character"
            });
        }

        const result = await signupService({
            ...req.body,
            email,
            name
        });

        res.status(201).json(result);
    } catch (error) {
        let statusCode = 400;

        if (error.message.includes("deleted")) statusCode = 403;
        if (error.message.includes("exists")) statusCode = 409;

        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};

// GOOGLE SYNC
exports.googleSync = async (req, res) => {
    try {
        const { email, name, firebaseUid } = req.body;
        const uid = firebaseUid || req.user.uid;

        if (!email || !name || !uid) {
            return res.status(400).json({
                success: false,
                message: "Email, Name and FirebaseUid are required"
            });
        }

        const result = await signupService({
            ...req.body,
            email: email.toLowerCase().trim(),
            name: name.trim(),
            firebaseUid: uid,
            authProvider: "google",
            password: "GOOGLE_USER_" + uid
        });

        return res.status(200).json(result);
    } catch (error) {
        console.error("Google Sync Error:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// TRUECALLER LOGIN
exports.truecallerLogin = async (req, res) => {
    try {
        // 🔥 FIX 1: req.body से deviceId भी निकालो
        let { name, mobile, email, authorizationCode, codeVerifier, deviceId } = req.body;

        if (authorizationCode || codeVerifier) {
            const profile = await fetchTruecallerProfile({ authorizationCode, codeVerifier });
            name = [profile.given_name, profile.family_name].filter(Boolean).join(" ") || profile.name || name;
            mobile = profile.phone_number || mobile;
            email = profile.email || email;
        }

        mobile = normalizeMobile(mobile);
        email = email?.toLowerCase().trim() || "";
        name = name?.trim() || "User";

        if (!mobile) {
            return res.status(400).json({
                success: false,
                message: "Mobile number is required"
            });
        }

        // 🔥 FIX 2: signupService को deviceId पास करो
        const result = await signupService({
            name,
            mobile,
            email,
            authProvider: "truecaller",
            deviceId: deviceId // 👉 अब यह डेटाबेस तक जाएगा!
        });

        return res.status(200).json(result);
    } catch (error) {
        console.error("Truecaller Error:", error.message);

        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};