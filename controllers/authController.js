// controllers/authController.js
const { authService } = require("../services/authService");

const TRUECALLER_CLIENT_ID = process.env.TRUECALLER_CLIENT_ID;
if (!TRUECALLER_CLIENT_ID) {
    throw new Error("CRITICAL: TRUECALLER_CLIENT_ID is missing in environment variables");
}

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
    if (digits.length < 10) return null; 
    return `+${digits}`;
};

const validateDevice = ({ deviceId, deviceFingerprint }) => {
    return {
        deviceId: deviceId?.trim() || null,
        deviceFingerprint: deviceFingerprint?.trim() || null
    };
};

const fetchTruecallerProfile = async ({ authorizationCode, codeVerifier }) => {
    if (!authorizationCode || !codeVerifier) {
        throw new Error("Truecaller authorization code and code verifier are required");
    }

    if (typeof fetch !== "function") {  
        throw new Error("Server fetch API is not available.");  
    }  

    const tokenParams = new URLSearchParams({  
        grant_type: "authorization_code",  
        client_id: TRUECALLER_CLIENT_ID,  
        code: authorizationCode,  
        code_verifier: codeVerifier  
    });  

    const tokenResponse = await fetch(TRUECALLER_TOKEN_URL, {  
        method: "POST",  
        headers: { "Content-Type": "application/x-www-form-urlencoded" },  
        body: tokenParams  
    });  

    const tokenBody = await readJsonResponse(tokenResponse);  
    if (!tokenResponse.ok || !tokenBody.access_token) {  
        throw new Error(tokenBody.error_description || tokenBody.message || "Truecaller token fetch failed");  
    }  

    const profileResponse = await fetch(TRUECALLER_USERINFO_URL, {  
        method: "GET",  
        headers: { Authorization: `Bearer ${tokenBody.access_token}` }  
    });  

    const profileBody = await readJsonResponse(profileResponse);  
    if (!profileResponse.ok) {  
        throw new Error(profileBody.error_description || profileBody.message || "Truecaller profile fetch failed");  
    }  

    return profileBody;
};

// ==========================================
// ✅ EMAIL SIGNUP
// ==========================================
exports.signup = async (req, res) => {
    try {
        const { email: rawEmail, password, name, deviceId, deviceFingerprint } = req.body;

        const email = rawEmail?.toLowerCase().trim();  
        const cleanName = name?.trim();  

        if (!email || !password) {  
            return res.status(400).json({ success: false, message: "Email and password are required" });  
        }  

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {  
            return res.status(400).json({ success: false, message: "Invalid email format" });  
        }  

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;  
        if (!passwordRegex.test(password)) {  
            return res.status(400).json({  
                success: false,  
                message: "Password must have at least 6 characters, including 1 uppercase, 1 lowercase, 1 number and 1 special character"  
            });  
        }  

        const device = validateDevice({ deviceId, deviceFingerprint });

        const result = await authService({  
            email: email,
            password: password,
            name: cleanName || "User",
            authProvider: "email",
            ...device
        });  

        const statusCode = result.isNewUser ? 201 : 200;
        return res.status(statusCode).json(result);  

    } catch (error) {  
        console.error("❌ Signup Error:", error.message);
        const statusCode = error.statusCode || (error.code === 'CONFLICT' ? 409 : 400);  
        return res.status(statusCode).json({ success: false, message: error.message });  
    }
};

// ==========================================
// ✅ GOOGLE SYNC
// ==========================================
exports.googleSync = async (req, res) => {
    try {
        // Client-side email validation and extraction is completely removed
        const { name, deviceId, deviceFingerprint } = req.body;

        const authHeader = req.headers.authorization;  
        const idToken = authHeader ? authHeader.replace(/^Bearer\s+/i, "") : req.body.idToken;  

        if (!idToken) {  
            return res.status(401).json({ success: false, message: "Firebase ID Token is required for secure sync" });  
        }  

        const device = validateDevice({ deviceId, deviceFingerprint });

        const result = await authService({  
            idToken: idToken, // authService will decode this to get the real email and UID
            name: name?.trim() || "User",
            authProvider: "google",
            ...device
        });  

        const statusCode = result.isNewUser ? 201 : 200;
        return res.status(statusCode).json(result);  

    } catch (error) {  
        console.error("❌ Google Sync Error:", error.message);  
        const statusCode = error.statusCode || 500;  
        return res.status(statusCode).json({ success: false, message: error.message });  
    }
};

// ==========================================
// ✅ TRUECALLER LOGIN 
// ==========================================
exports.truecallerLogin = async (req, res) => {
    try {
        const { authorizationCode, codeVerifier, deviceId, deviceFingerprint, name: bodyName } = req.body;

        if (!authorizationCode || !codeVerifier) {  
            return res.status(400).json({ success: false, message: "Truecaller authorization code and verifier are strictly required" });  
        }  

        const profile = await fetchTruecallerProfile({ authorizationCode, codeVerifier });  
        const image = profile.picture || profile.avatar || "";  
        
        const trustedMobile = normalizeMobile(profile.phone_number);  
        if (!trustedMobile) {  
            return res.status(400).json({ success: false, message: "Failed to securely retrieve a valid mobile number from Truecaller" });  
        }  

        const finalName = [profile.given_name, profile.family_name].filter(Boolean).join(" ") || profile.name || bodyName?.trim() || "User";  
        const finalEmail = profile.email?.toLowerCase().trim() || null;  

        const device = validateDevice({ deviceId, deviceFingerprint });

        const result = await authService({  
            name: finalName,
            mobile: trustedMobile,
            email: finalEmail,
            authProvider: "truecaller",
            truecallerAvatar: image,
            ...device
        });  

        const statusCode = result.isNewUser ? 201 : 200;
        return res.status(statusCode).json(result);  

    } catch (error) {  
        console.error("❌ Truecaller Error:", error.message);  
        return res.status(400).json({ success: false, message: error.message });  
    }
};
