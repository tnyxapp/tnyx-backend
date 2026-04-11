// services/signupHelpers.js
const admin = require("../config/firebase");
const supabase = require("../config/supabase"); // 🔥 Supabase इम्पोर्ट

// 1. Firebase Auth Helper (इसमें कोई बदलाव नहीं)
exports.handleFirebaseUser = async (data) => {
    let firebaseUser;
    let profileImage = "";
    const { authProvider, email, password, mobile, name, firebaseUid, truecallerAvatar, photoURL } = data;

    if (authProvider === "email") {
        try { firebaseUser = await admin.auth().getUserByEmail(email); } 
        catch (err) {
            if (err.code === "auth/user-not-found") firebaseUser = await admin.auth().createUser({ email, password, displayName: name });
            else throw new Error("Firebase error: " + err.message);
        }
    } else if (authProvider === "truecaller") {
        try { firebaseUser = await admin.auth().getUserByPhoneNumber(`+91${mobile}`); } 
        catch (err) {
            if (err.code === "auth/user-not-found") firebaseUser = await admin.auth().createUser({ phoneNumber: `+91${mobile}`, displayName: name || "Truecaller User" });
            else throw new Error("Firebase error: " + err.message);
        }
        profileImage = truecallerAvatar || "";
    } else if (authProvider === "google") { 
        firebaseUser = { uid: firebaseUid };
        if (photoURL) profileImage = photoURL; 
    }

    return { firebaseUser, profileImage };
};

// 2. Check Device & Valid Referral Code (🔥 Supabase SQL Query)
exports.checkReferralAndDevice = async (deviceId, referralCode) => {
    let deviceRecord = null;
    let appliedReferral = false;
    let refUser = null;

    if (deviceId) {
        // डिवाइस ढूँढें
        let { data } = await supabase.from('devices').select('*').eq('device_id', deviceId).maybeSingle();
        if (!data) {
            // नया डिवाइस बनाएँ
            const { data: newDev } = await supabase.from('devices').insert([{ device_id: deviceId }]).select().single();
            deviceRecord = newDev;
        } else {
            deviceRecord = data;
        }
    }

    if (referralCode) {
        if (deviceId && deviceRecord?.referral_used) {
            console.warn("Referral already used on this device.");
        } else {
            // रेफरल कोड वाले यूज़र को ढूँढें
            let { data } = await supabase.from('users').select('*').eq('referral_code', referralCode).maybeSingle();
            if (data) { 
                refUser = data; 
                appliedReferral = true; 
            }
        }
    }
    return { deviceRecord, refUser, appliedReferral };
};

// 3. Reward Old User / Referrer (🔥 Supabase Update)
exports.rewardReferrer = async (refUser, planConfig) => {
    if (!refUser) return;
    const now = new Date();
    
    let trialStart = refUser.trial_start;
    let trialEnd = refUser.trial_end ? new Date(refUser.trial_end) : null;

    if (trialEnd && trialEnd > now) {
        // Extend Pro by 7 days
        trialEnd = new Date(trialEnd.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else {
        // Start new 7-Day Pro
        trialStart = now;
        trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    // Supabase Update Query
    await supabase.from('users').update({
        trial_start: trialStart,
        trial_end: trialEnd,
        ai_plan: "pro",
        referral_count: (refUser.referral_count || 0) + 1,
        ai_credits: planConfig["pro"].credits,
        ai_total_limit: planConfig["pro"].limit
    }).eq('id', refUser.id);
};