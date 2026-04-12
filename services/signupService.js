// services/signupService.js
const admin = require("../config/firebase");
const supabase = require("../config/supabase");
const { handleFirebaseUser, checkReferralAndDevice, rewardReferrer } = require("./signupHelpers");

// ❌ MetabolicEngine और MicronutrientEngine के इम्पोर्ट्स हटा दिए गए हैं

// ❌ calculateAge और mapActivityLevel हटा दिए गए हैं क्योंकि अब उनका यहाँ कोई काम नहीं

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

    if (authProvider === "email" && (!email || !password || password.length < 6)) {
        const err = new Error("Invalid Email or Password");
        err.statusCode = 400;
        throw err;
    }
    
    // सिर्फ वही कॉलम्स आ रहे हैं जिनकी नीचे अपडेट के लिए ज़रूरत है
    const selectedColumns = 'id, is_deleted, name, email, mobile, auth_provider, firebase_uid, device_id, gender, dob, activity_level, current_weight, target_weight';
    
    let query = supabase.from('users').select(selectedColumns);
    if (email && mobile) query = query.or(`email.eq.${email},mobile.eq.${mobile}`);
    else if (email) query = query.eq('email', email);
    else if (mobile) query = query.eq('mobile', mobile);
    
    let { data: user, error: fetchError } = await query.maybeSingle();
    
    if (fetchError) throw new Error(`Database fetch failed: ${fetchError.message}`);

    if (user && user.is_deleted) {
        const err = new Error("Account deleted. Please recover.");
        err.statusCode = 403;
        throw err;
    }

    const { deviceRecord, refUser, appliedReferral } = await checkReferralAndDevice(deviceId, !user ? referral : null);
    const { firebaseUser, profileImage } = await handleFirebaseUser(data);

    const planConfig = { free: { credits: 10, limit: 10 }, pro: { credits: 100, limit: 100 }, premium: { credits: 500, limit: 500 } };
    const safeNumber = (val) => isNaN(Number(val)) ? 0 : Number(val);
    const plan = ["free", "pro", "premium"].includes(membership) ? membership : "free";

    // बेसिक डेटा फॉर्मेटिंग (DB में सेव करने के लिए)
    const weight = safeNumber(data.current_weight || data.currentWeight);
    const height = safeNumber(data.height);
    const goal = mapGoal(data.goals?.[0]);

    // ❌ Engine Calculations (BMR, TDEE, Macros, Micros) पूरी तरह हटा दिए गए हैं

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
            step_target: goal === "lose_weight" ? 10000 : 8000,
            water_target: 3 // Default 3L, यह Update Profile में सही सेट होगा
        };

        const { data: updated, error: updateError } = await supabase.from('users').update(updateData).eq('id', user.id).select('id, referral_code, firebase_uid').single();
        
        if (updateError) throw new Error(`User update failed: ${updateError.message}`);
        
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
            membership: plan, 
            goals: data.goals || [],
            gender: data.gender || "",
            dob: data.dob ? new Date(Number(data.dob)).toISOString() : null,
            height: height,
            current_weight: weight,
            target_weight: safeNumber(data.target_weight),
            activity_level: data.activityLevel || "",
            step_target: goal === "lose_weight" ? 10000 : 8000,
            water_target: 3 // Default 3L
        };

        const { data: newUser, error: insertError } = await supabase.from('users').insert([insertData]).select('id, referral_code, firebase_uid').single();
        
        if (insertError) throw new Error(`User creation failed: ${insertError.message}`);
        
        finalUser = newUser;
        isNewUser = true;
    }

    // ❌ nutrition_targets टेबल सिंक (upsert) का पूरा ब्लॉक हटा दिया गया है

    // Referral rewards logic...
    if (isNewUser && deviceId && deviceRecord && appliedReferral) {
        await supabase.from('devices').update({ referral_used: true }).eq('device_id', deviceId);
        if (refUser) await rewardReferrer(refUser, planConfig);
    }

    let customToken = null;
    if (authProvider === "truecaller" && finalUser.firebase_uid) {
        try { 
            customToken = await admin.auth().createCustomToken(finalUser.firebase_uid); 
        } catch (e) {
            console.error("⚠️ Custom Token Generation Failed:", e.message);
        }
    }

    return {
        success: true,
        isNewUser,
        customToken,
        user: {
            id: finalUser.id,
            referralCode: finalUser.referral_code
            // ❌ targets (calories, protein) यहाँ से हटा दिए गए हैं 
        }
    };
};
