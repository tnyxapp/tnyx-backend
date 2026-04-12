// services/signupService.js
const admin = require("../config/firebase");
const supabase = require("../config/supabase");
const { handleFirebaseUser, checkReferralAndDevice, rewardReferrer } = require("./signupHelpers");

// 🔥 इंजन इम्पोर्ट करें (पाथ चेक कर लें)
const MetabolicEngine = require("../core/MetabolicEngine");
const MicronutrientEngine = require("../core/MicronutrientEngine");

// 💡 उम्र कैलकुलेट करने के लिए हेल्पर
const calculateAge = (dob) => {
    if (!dob) return 25; // Default age if missing
    const birthDate = new Date(dob);
    const ageDifMs = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
};

// 💡 एक्टिविटी लेवल को इंजन के कीवर्ड्स से मैच करने के लिए
const mapActivityLevel = (level) => {
    const mapping = {
        "sedentary": "sedentary",
        "lightly active": "light",
        "moderately active": "moderate",
        "very active": "active",
        "extra active": "very_active"
    };
    return mapping[level?.toLowerCase()] || "sedentary";
};

// 💡 गोल (Goal) को इंजन के कीवर्ड्स से मैच करने के लिए
const mapGoal = (goal) => {
    if (goal?.toLowerCase().includes("lose")) return "lose_weight";
    if (goal?.toLowerCase().includes("gain")) return "gain_muscle";
    return "maintenance";
};

exports.signupService = async (data) => {
    let {
        email, password, mobile, name, authProvider = "email", firebaseUid, deviceId, referral, membership
    } = data;

    email = email?.toLowerCase().trim();
    name = name?.trim();

    // 1. Basic Validation (as before)
    if (authProvider === "email" && (!email || !password || password.length < 6)) throw new Error("Invalid Email/Password");
    
    // 2. Check Existing User
    let query = supabase.from('users').select('*');
    if (email && mobile) query = query.or(`email.eq.${email},mobile.eq.${mobile}`);
    else if (email) query = query.eq('email', email);
    else if (mobile) query = query.eq('mobile', mobile);
    
    let { data: user } = await query.maybeSingle();
    if (user && user.is_deleted) throw new Error("Account deleted. Please recover.");

    // 3. Referral & Device Check
    const { deviceRecord, refUser, appliedReferral } = await checkReferralAndDevice(deviceId, !user ? referral : null);

    // 4. Firebase & Profile Image
    const { firebaseUser, profileImage } = await handleFirebaseUser(data);

    // 5. Plan Config
    const planConfig = { free: { credits: 10, limit: 10 }, pro: { credits: 100, limit: 100 }, premium: { credits: 500, limit: 500 } };
    const safeNumber = (val) => isNaN(Number(val)) ? 0 : Number(val);
    const plan = ["free", "pro", "premium"].includes(membership) ? membership : "free";

    // ==========================================
    // 🚀 🔥 AUTO-CALCULATE TARGETS (THE ENGINE)
    // ==========================================
    const weight = safeNumber(data.current_weight || data.currentWeight);
    const height = safeNumber(data.height);
    const age = calculateAge(data.dob);
    const gender = data.gender?.toLowerCase() || "male";
    const activity = mapActivityLevel(data.activityLevel);
    const goal = mapGoal(data.goals?.[0]);

    // BMR -> TDEE -> Base Calories
    const bmr = MetabolicEngine.getBMR(weight, height, age, gender);
    const tdee = MetabolicEngine.getTDEE(bmr, activity);
    const baseCalories = MetabolicEngine.getBaseCalories(tdee, goal);
    
    // Macros (Protein, Fats, Carbs, Fiber)
    val macros = MetabolicEngine.getMacros(baseCalories, weight, goal);

    // Micros & Water
    const micros = MicronutrientEngine.calculateTargets(gender, age, weight);

    let isNewUser = false;

    // ==========================================
    // 🟢 UPDATE OR CREATE SUPABASE USER
    // ==========================================
    const commonNutrientData = {
        target_calories: macros.calories,
        target_protein: macros.protein,
        target_fats: macros.fats,
        target_carbs: macros.carbs,
        target_fiber: macros.fiber,
        water_target: Math.round(micros.water_ml / 1000), // Liters में स्टोर करने के लिए
        step_target: goal === "lose_weight" ? 10000 : 8000,
        sleep_target: 8,
        // माइक्रो न्यूट्रिएंट्स को JSONB कॉलम में डाल सकते हैं
        micronutrient_targets: micros
    };

    if (user) {
        // 🔥 UPDATE Existing User
        const updateData = {
            ...commonNutrientData,
            name: name || user.name || "User",
            email: email || user.email,
            mobile: mobile || user.mobile,
            auth_provider: user.auth_provider || authProvider,
            firebase_uid: (firebaseUser?.uid && !user.firebase_uid) ? firebaseUser.uid : user.firebase_uid,
            device_id: deviceId || user.device_id,
            gender: data.gender || user.gender,
            dob: data.dob ? new Date(Number(data.dob)).toISOString() : user.dob,
            activity_level: data.activityLevel || user.activity_level,
            current_weight: weight || user.current_weight,
            target_weight: data.target_weight ? safeNumber(data.target_weight) : user.target_weight,
        };

        const { error } = await supabase.from('users').update(updateData).eq('id', user.id);
        if (error) throw new Error("Failed to update user in Supabase");
    } 
    else {
        // 🔥 CREATE New User
        let assignedAiPlan = plan;
        let trialStart = null, trialEnd = null, isTrialUsed = false;

        if (appliedReferral) {
            trialStart = new Date();
            trialEnd = new Date(trialStart.getTime() + 7 * 24 * 60 * 60 * 1000);
            isTrialUsed = true; 
            assignedAiPlan = "pro"; 
        }

        const generatedReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        const insertData = {
            ...commonNutrientData, // ऑटो-कैलकुलेटेड टार्गेट्स यहाँ जुड़ गए
            firebase_uid: firebaseUser?.uid || null,
            profile_image: profileImage,
            email: email || null,
            mobile: mobile || null,
            auth_provider: authProvider,
            device_id: deviceId || null,
            name: name || "User",
            referral_code: generatedReferralCode,
            referred_by: appliedReferral ? refUser.id : null,
            referral: referral || "",
            
            trial_start: trialStart,
            trial_end: trialEnd,
            is_trial_used: isTrialUsed,
            membership: "free",
            ai_plan: assignedAiPlan,
            ai_credits: planConfig[assignedAiPlan].credits,
            ai_total_limit: planConfig[assignedAiPlan].limit,
            ai_used: 0,

            goals: data.goals || [],
            gender: data.gender || "",
            dob: data.dob ? new Date(Number(data.dob)).toISOString() : null,
            height: height,
            current_weight: weight,
            target_weight: safeNumber(data.target_weight),
            activity_level: data.activityLevel || "",
            gym_access: data.gymAccess ?? false,
            training_days: Array.isArray(data.trainingDays) ? data.trainingDays : []
        };

        const { data: newUser, error } = await supabase.from('users').insert([insertData]).select().single();
        
        if (error) throw new Error("Database error. Signup failed");
        user = newUser;
        isNewUser = true;

        if (deviceId && deviceRecord && appliedReferral) {
            await supabase.from('devices').update({ referral_used: true }).eq('device_id', deviceId);
        }
        if (appliedReferral && refUser) {
            await rewardReferrer(refUser, planConfig);
        }
    }

    let customToken = null;
    if (authProvider === "truecaller" && user.firebase_uid) {
        try { customToken = await admin.auth().createCustomToken(user.firebase_uid); } catch (e) {}
    }

    return {
        success: true,
        message: isNewUser ? "Account created" : "Account synced",
        isNewUser,
        customToken,
        user: {
            id: user.id,
            referralCode: user.referral_code,
            aiCredits: user.ai_credits,
            aiPlan: user.ai_plan,
            isTrialUsed: user.is_trial_used,
            // टार्गेट्स भी भेज सकते हैं ताकि एंड्राइड तुरंत होम अपडेट कर दे
            targets: {
                calories: user.target_calories,
                protein: user.target_protein,
                water: user.water_target
            }
        }
    };
};
