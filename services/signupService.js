// services/signupService.js
const admin = require("../config/firebase");
const supabase = require("../config/supabase");
const { handleFirebaseUser, checkReferralAndDevice, rewardReferrer } = require("./signupHelpers");

// 🔥 इंजन इम्पोर्ट
const MetabolicEngine = require("../core/MetabolicEngine");
const MicronutrientEngine = require("../core/MicronutrientEngine");

const calculateAge = (dob) => {
    if (!dob) return 25;
    const birthDate = new Date(dob);
    const ageDifMs = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
};

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

    if (authProvider === "email" && (!email || !password || password.length < 6)) throw new Error("Invalid Email/Password");
    
    let query = supabase.from('users').select('*');
    if (email && mobile) query = query.or(`email.eq.${email},mobile.eq.${mobile}`);
    else if (email) query = query.eq('email', email);
    else if (mobile) query = query.eq('mobile', mobile);
    
    let { data: user } = await query.maybeSingle();
    if (user && user.is_deleted) throw new Error("Account deleted. Please recover.");

    const { deviceRecord, refUser, appliedReferral } = await checkReferralAndDevice(deviceId, !user ? referral : null);
    const { firebaseUser, profileImage } = await handleFirebaseUser(data);

    const planConfig = { free: { credits: 10, limit: 10 }, pro: { credits: 100, limit: 100 }, premium: { credits: 500, limit: 500 } };
    const safeNumber = (val) => isNaN(Number(val)) ? 0 : Number(val);
    const plan = ["free", "pro", "premium"].includes(membership) ? membership : "free";

    // 🔥 इंजन कैलकुलेशन
    const weight = safeNumber(data.current_weight || data.currentWeight);
    const height = safeNumber(data.height);
    const age = calculateAge(data.dob);
    const gender = data.gender?.toLowerCase() || "male";
    const activity = mapActivityLevel(data.activityLevel);
    const goal = mapGoal(data.goals?.[0]);

    const bmr = MetabolicEngine.getBMR(weight, height, age, gender);
    const tdee = MetabolicEngine.getTDEE(bmr, activity);
    const baseCalories = MetabolicEngine.getBaseCalories(tdee, goal);
    const macros = MetabolicEngine.getMacros(baseCalories, weight, goal);
    const micros = MicronutrientEngine.calculateTargets(gender, age, weight);

    let isNewUser = false;
    let finalUser;

    // 🟢 UPDATE OR CREATE USER
    if (user) {
        const updateData = {
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
            // स्टेप्स और पानी का टार्गेट 'users' टेबल में है
            step_target: goal === "lose_weight" ? 10000 : 8000,
            water_target: Math.round(micros.water_ml / 1000)
        };

        const { data: updated, error } = await supabase.from('users').update(updateData).eq('id', user.id).select().single();
        if (error) throw new Error("Update failed");
        finalUser = updated;
    } else {
        const generatedReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const insertData = {
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
            membership: "free",
            goals: data.goals || [],
            gender: data.gender || "",
            dob: data.dob ? new Date(Number(data.dob)).toISOString() : null,
            height: height,
            current_weight: weight,
            target_weight: safeNumber(data.target_weight),
            activity_level: data.activityLevel || "",
            step_target: goal === "lose_weight" ? 10000 : 8000,
            water_target: Math.round(micros.water_ml / 1000)
        };

        const { data: newUser, error } = await supabase.from('users').insert([insertData]).select().single();
        if (error) throw new Error("Insert failed");
        finalUser = newUser;
        isNewUser = true;
    }

    // 🚀 🔥 NUTRITION TARGETS टेबल सिंक
    await supabase.from('nutrition_targets').upsert({
        user_id: finalUser.id,
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fats: macros.fats,
        fiber: macros.fiber,
        water_ml: micros.water_ml,
        vitamins: micros.vitamins,
        minerals: micros.minerals,
        metabolic: { bmr, tdee, goal_mapped: goal }
    });

    // Referral rewards logic...
    if (isNewUser && deviceId && deviceRecord && appliedReferral) {
        await supabase.from('devices').update({ referral_used: true }).eq('device_id', deviceId);
        if (refUser) await rewardReferrer(refUser, planConfig);
    }

    let customToken = null;
    if (authProvider === "truecaller" && finalUser.firebase_uid) {
        try { customToken = await admin.auth().createCustomToken(finalUser.firebase_uid); } catch (e) {}
    }

    return {
        success: true,
        isNewUser,
        customToken,
        user: {
            id: finalUser.id,
            referralCode: finalUser.referral_code,
            targets: {
                calories: macros.calories,
                protein: macros.protein
            }
        }
    };
};
