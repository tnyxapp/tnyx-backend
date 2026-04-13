// controllers/authController.js

const { signupService } = require("../services/signupService"); 
const supabase = require("../config/supabase");

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
    let digits = String(mobile || "").replace(/\D/g, ""); 
    if (!mobile.startsWith('+')) {
        return `+${digits}`;
    }
    return mobile;
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
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: tokenParams
    });

    const tokenBody = await readJsonResponse(tokenResponse);
    if (!tokenResponse.ok || !tokenBody.access_token) {
        throw new Error(tokenBody.error_description || tokenBody.message || tokenBody.error || "Truecaller token fetch failed");
    }

    const profileResponse = await fetch(TRUECALLER_USERINFO_URL, {
        method: "GET",
        headers: { Authorization: `Bearer ${tokenBody.access_token}` }
    });

    const profileBody = await readJsonResponse(profileResponse);
    if (!profileResponse.ok) {
        throw new Error(profileBody.error_description || profileBody.message || profileBody.error || "Truecaller profile fetch failed");
    }

    return profileBody;
};

// ==========================================
// ✅ EMAIL SIGNUP
// ==========================================
exports.signup = async (req, res) => {
    try {
        let { email, password, name } = req.body;

        email = email?.toLowerCase().trim();
        name = name?.trim();

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

        const result = await signupService({
            ...req.body,
            email,
            name,
            authProvider: "email"
        });

        res.status(201).json(result);
    } catch (error) {
        const statusCode = error.statusCode || (error.code === 'CONFLICT' ? 409 : 400);
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

// ==========================================
// ✅ GOOGLE SYNC 
// ==========================================
exports.googleSync = async (req, res) => {
    try {
        const { idToken, name, email: bodyEmail } = req.body;

        if (!idToken) {
            return res.status(401).json({ success: false, message: "Firebase ID Token is required for secure sync" });
        }

        const uid = req.body.firebaseUid || req.user?.uid; 
        const email = bodyEmail;

        if (!email || !uid) {
            return res.status(400).json({ success: false, message: "Valid Email and UID are required" });
        }

        const result = await signupService({
            ...req.body,
            email: email.toLowerCase().trim(),
            name: name?.trim() || "User",
            firebaseUid: uid,
            authProvider: "google"
        });

        return res.status(200).json(result);
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
        const { authorizationCode, codeVerifier, deviceId, name: bodyName, email: bodyEmail } = req.body;

        if (!authorizationCode || !codeVerifier) {
            return res.status(400).json({ success: false, message: "Truecaller authorization code and verifier are strictly required" });
        }

        const profile = await fetchTruecallerProfile({ authorizationCode, codeVerifier });
        const image = profile.picture || profile.avatar || "";
        
        const trustedMobile = normalizeMobile(profile.phone_number);
        if (!trustedMobile) {
            return res.status(400).json({ success: false, message: "Failed to securely retrieve mobile number from Truecaller" });
        }

        const finalName = [profile.given_name, profile.family_name].filter(Boolean).join(" ") || profile.name || bodyName?.trim() || "User";
        const finalEmail = profile.email || bodyEmail?.toLowerCase().trim() || "";

        const result = await signupService({
            ...req.body,
            name: finalName,
            mobile: trustedMobile, 
            email: finalEmail,
            authProvider: "truecaller",
            deviceId: deviceId,
            truecallerAvatar: image 
        });

        return res.status(200).json(result);
    } catch (error) {
        console.error("❌ Truecaller Error:", error.message);
        return res.status(400).json({ success: false, message: error.message });
    }
};

// ==========================================
// ✅ UPDATE PROFILE (Safeguarded against Data Overwrite)
// ==========================================
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id; 
        const data = req.body;
        const safeNumber = (val) => isNaN(Number(val)) ? 0 : Number(val);

        const updateData = {};

        // 🔥 1. BASIC PROFILE (Partial Update Fix)
        if (data.gender !== undefined) updateData.gender = data.gender;
        
        // 🔥 5. DOB Conversion Edge Case Fix (Handles both Timestamp numbers and strings)
        if (data.dob) updateData.dob = new Date(Number(data.dob) || data.dob).toISOString();
        
        if (data.height !== undefined) updateData.height = safeNumber(data.height);
        if (data.currentWeight !== undefined) updateData.current_weight = safeNumber(data.currentWeight);
        if (data.targetWeight !== undefined) updateData.target_weight = safeNumber(data.targetWeight);
        if (data.activityLevel !== undefined) updateData.activity_level = data.activityLevel;
        if (Array.isArray(data.goals)) updateData.goals = data.goals;

        // 🔥 WORKOUT
        if (data.gymAccess !== undefined) updateData.gym_access = data.gymAccess;
        if (Array.isArray(data.trainingDays)) updateData.training_days = data.trainingDays;
        if (Array.isArray(data.equipment)) updateData.equipment = data.equipment;
        if (Array.isArray(data.focusAreas)) updateData.focus_areas = data.focusAreas;
        if (data.workoutDuration !== undefined) updateData.workout_duration = data.workoutDuration;
        if (data.workoutSplit !== undefined) updateData.workout_split = data.workoutSplit;

        // 🔥 2. STEP TARGET LOGIC FIX
        if (data.stepTarget !== undefined) {
            updateData.step_target = safeNumber(data.stepTarget);
        } else if (!updateData.step_target) {
            // Only set default if it's not provided AND we are doing an initial setup
            updateData.step_target = 8000;
        }

        // 🔥 3. WATER TARGET DEFAULT FIX
        if (data.waterTarget !== undefined) {
            updateData.water_target = safeNumber(data.waterTarget);
        } else if (!updateData.water_target) {
            updateData.water_target = 3;
        }

        if (data.sleepTarget !== undefined) updateData.sleep_target = safeNumber(data.sleepTarget);

        // 🔥 6. Added .select() to ensure updated data is returned
        const { data: updatedUser, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;

        return res.status(200).json({ 
            success: true, 
            message: "Profile updated successfully",
            data: updatedUser 
        });

    } catch (error) {
        console.error("❌ Update Profile Error:", error);
        return res.status(500).json({ success: false, message: "Failed to update profile targets" });
    }
};