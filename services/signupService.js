// services/signupService.js
const admin = require("../config/firebase");
const supabase = require("../config/supabase"); // 🔥 Supabase इम्पोर्ट
const { handleFirebaseUser, checkReferralAndDevice, rewardReferrer } = require("./signupHelpers");

exports.signupService = async (data) => {
    let {
        email, password, mobile, name, authProvider = "email", firebaseUid, deviceId, referral, membership
    } = data;

    email = email?.toLowerCase().trim();
    name = name?.trim();

    // 1. Basic Validation
    if (authProvider === "email" && (!email || !password || password.length < 6)) throw new Error("Invalid Email/Password");
    if (authProvider === "truecaller" && !/^[6-9]\d{9}$/.test(mobile)) throw new Error("Invalid mobile number");
    if (authProvider === "google" && (!email || !firebaseUid)) throw new Error("Google auth failed");

    // 2. Check Existing User (🔥 Supabase Select Query)
    let query = supabase.from('users').select('*');
    if (email && mobile) query = query.or(`email.eq.${email},mobile.eq.${mobile}`);
    else if (email) query = query.eq('email', email);
    else if (mobile) query = query.eq('mobile', mobile);
    
    let { data: user, error: userError } = await query.maybeSingle();

    if (user && email && user.email && user.email !== email && authProvider !== "email") throw new Error("Email linked with another account");
    if (user && user.is_deleted) throw new Error("Account deleted. Please recover.");

    // 3. Referral & Device Check
    const { deviceRecord, refUser, appliedReferral } = await checkReferralAndDevice(deviceId, !user ? referral : null);

    // 4. Firebase & Profile Image
    const { firebaseUser, profileImage } = await handleFirebaseUser(data);

    // 5. Plan Config
    const planConfig = { free: { credits: 10, limit: 10 }, pro: { credits: 100, limit: 100 }, premium: { credits: 500, limit: 500 } };
    const safeNumber = (val) => isNaN(Number(val)) ? 0 : Number(val);
    const plan = ["free", "pro", "premium"].includes(membership) ? membership : "free";

    let isNewUser = false;

    // ==========================================
    // 🟢 UPDATE OR CREATE SUPABASE USER
    // ==========================================
    if (user) {
        // 🔥 UPDATE Existing User
        const updateData = {
            name: name || user.name || "User",
            email: email || user.email,
            mobile: mobile || user.mobile,
            auth_provider: user.auth_provider || authProvider,
            firebase_uid: (firebaseUser?.uid && !user.firebase_uid) ? firebaseUser.uid : user.firebase_uid,
            device_id: deviceId || user.device_id,
            gender: data.gender || user.gender,
            dob: data.dob || user.dob,
            activity_level: data.activityLevel || user.activity_level,
            current_weight: data.current_weight ? safeNumber(data.current_weight) : user.current_weight,
            target_weight: data.target_weight ? safeNumber(data.target_weight) : user.target_weight,
        };

        if (user.ai_credits === 0 && user.ai_used === 0) {
            updateData.ai_plan = plan;
            updateData.ai_credits = planConfig[plan].credits;
            updateData.ai_total_limit = planConfig[plan].limit;
        }

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

        // Mongoose के ObjectId की जगह 6 अक्षर का Random Referral Code
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
            dob: data.dob || null,
            height: safeNumber(data.height),
            current_weight: safeNumber(data.current_weight),
            target_weight: safeNumber(data.target_weight),
            activity_level: data.activityLevel || "",
            gym_access: data.gymAccess ?? false,
            training_days: Array.isArray(data.trainingDays) ? data.trainingDays : []
        };

        const { data: newUser, error } = await supabase.from('users').insert([insertData]).select().single();
        
        if (error) {
            console.error("🔴 SUPABASE INSERT ERROR:", error);
            if ((authProvider === "email" || authProvider === "truecaller") && firebaseUser?.uid) {
                try { await admin.auth().deleteUser(firebaseUser.uid); } catch (e) {}
            }
            throw new Error("Database error. Signup failed");
        }

        user = newUser; // नीचे response में भेजने के लिए
        isNewUser = true;

        // Device Record update
        if (deviceId && deviceRecord && appliedReferral) {
            await supabase.from('devices').update({ referral_used: true }).eq('device_id', deviceId);
        }

        // Reward Old User
        if (appliedReferral && refUser) {
            await rewardReferrer(refUser, planConfig);
        }
    }

    // Generate Custom Token for Truecaller
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
            id: user.id, // Supabase UUID
            referralCode: user.referral_code,
            aiCredits: user.ai_credits,
            aiPlan: user.ai_plan,
            isTrialUsed: user.is_trial_used
        }
    };
};