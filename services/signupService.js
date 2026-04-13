const admin = require("../config/firebase");
const supabase = require("../config/supabase");
const { handleFirebaseUser, checkReferralAndDevice, rewardReferrer } = require("./signupHelpers");

const mapGoal = (goal) => {
    if (goal?.toLowerCase().includes("lose")) return "lose_weight";
    if (goal?.toLowerCase().includes("gain")) return "gain_muscle";
    return "maintenance";
};
const validateActivity = (level) => {
    const allowed = ["sedentary", "light", "active", "very_active"]; // इसमें 'dynamic' हटा दें या वो डालें जो Supabase में है
    return allowed.includes(level) ? level : "sedentary";
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

    const weight = safeNumber(data.current_weight || data.currentWeight);
    const height = safeNumber(data.height);
    const goal = mapGoal(data.goals?.[0]);

    let isNewUser = false;
    let finalUser;

    // 🟢 UPDATE OR CREATE USER
    if (user) {
        // 🔥 FIX 1: Partial Update (Data Overwrite Bug Prevention)
        const updateData = {
            name: name || user.name || "User",
            email: email || user.email,
            mobile: mobile || user.mobile,
            auth_provider: user.auth_provider || authProvider,
            firebase_uid: (firebaseUser?.uid && !user.firebase_uid) ? firebaseUser.uid : user.firebase_uid,
            device_id: deviceId || user.device_id,
        };

        // सिर्फ तभी अपडेट करें जब फ्रंटएंड ने डेटा भेजा हो
        if (data.gender !== undefined) updateData.gender = data.gender;
        
        // 🔥 FIX 2: DOB safe parsing (Handles both strings and timestamps)
        if (data.dob) updateData.dob = new Date(Number(data.dob) || data.dob).toISOString();
        
        if (data.activityLevel !== undefined) {
    updateData.activity_level = data.activityLevel || "sedentary";
}
        if (weight > 0) updateData.current_weight = weight;
        if (data.target_weight !== undefined || data.targetWeight !== undefined) {
            updateData.target_weight = safeNumber(data.target_weight || data.targetWeight);
        }

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
            
            // 🔥 FIX 3: AI Credits Logic Default Set
            membership: plan,
            ai_plan: plan,
            ai_credits: planConfig[plan].credits,
            ai_total_limit: planConfig[plan].limit,

            goals: data.goals || [],
            gender: data.gender || "",
            // 🔥 FIX 2: DOB safe parsing
            dob: data.dob ? new Date(Number(data.dob) || data.dob).toISOString() : null,
            height: height,
            current_weight: weight,
            target_weight: safeNumber(data.target_weight || data.targetWeight),
            activity_level: validateActivity(data.activityLevel),
            step_target: goal === "lose_weight" ? 10000 : 8000,
            water_target: 3 // Default 3L
        };

        const { data: newUser, error: insertError } = await supabase.from('users').insert([insertData]).select('id, referral_code, firebase_uid').single();
        
        if (insertError) throw new Error(`User creation failed: ${insertError.message}`);
        
        finalUser = newUser;
        isNewUser = true;
    }

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
        }
    };
};