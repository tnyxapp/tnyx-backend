// services/signupHelpers.js
const admin = require("../config/firebase");
const supabase = require("../config/supabase"); 

// ==========================================
// 1. Firebase Auth Helper 
// ==========================================
exports.handleFirebaseUser = async (data) => {
    let firebaseUser;
    let profileImage = "";
    const { authProvider, email, password, mobile, name, firebaseUid, truecallerAvatar, photoURL, idToken } = data;

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
        if (!idToken) {
            const err = new Error("Firebase ID Token is strictly required for Google Login");
            err.statusCode = 401;
            throw err;
        }
        try {
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            firebaseUser = { uid: decodedToken.uid };
            profileImage = photoURL || decodedToken.picture || ""; 
        } catch (err) {
            const error = new Error("Invalid or expired Google Token");
            error.statusCode = 401;
            throw error;
        }
    }

    return { firebaseUser, profileImage };
};

// ==========================================
// 2. Check Device & Valid Referral Code
// ==========================================
exports.checkReferralAndDevice = async (deviceId, referralCode) => {
    let deviceRecord = null;
    let appliedReferral = false;
    let refUser = null;

    if (deviceId) {
        let { data, error: fetchError } = await supabase
            .from('devices')
            .select('device_id, referral_used')
            .eq('device_id', deviceId)
            .maybeSingle();

        if (fetchError) throw new Error(`Device check failed: ${fetchError.message}`);

        if (!data) {
            const { data: newDev, error: insertError } = await supabase
                .from('devices')
                .insert([{ device_id: deviceId }])
                .select('device_id, referral_used')
                .single();
            
            if (insertError) throw new Error(`Device registration failed: ${insertError.message}`);
            deviceRecord = newDev;
        } else {
            deviceRecord = data;
        }
    }

    if (referralCode) {
        if (deviceId && deviceRecord?.referral_used) {
            console.warn("⚠️ Referral already used on this device.");
        } else {
            let { data, error: refError } = await supabase
                .from('users')
                .select('id, trial_start, trial_end, referral_count')
                .eq('referral_code', referralCode)
                .maybeSingle();
            
            if (refError) throw new Error(`Referral verification failed: ${refError.message}`);
            
            if (data) { 
                refUser = data; 
                appliedReferral = true; 
            }
        }
    }
    return { deviceRecord, refUser, appliedReferral };
};

// ==========================================
// 3. Reward Old User / Referrer 
// ==========================================
exports.rewardReferrer = async (refUser, planConfig) => {
    if (!refUser) return;
    const now = new Date();
    
    let trialStart = refUser.trial_start ? new Date(refUser.trial_start) : now;
    let trialEnd = refUser.trial_end ? new Date(refUser.trial_end) : null;

    if (trialEnd && trialEnd > now) {
        trialEnd = new Date(trialEnd.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else {
        trialStart = now;
        trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const { error } = await supabase.from('users').update({
        trial_start: trialStart.toISOString(),
        trial_end: trialEnd.toISOString(),
        ai_plan: "pro",
        referral_count: (refUser.referral_count || 0) + 1,
        ai_credits: planConfig["pro"].credits,
        ai_total_limit: planConfig["pro"].limit
    }).eq('id', refUser.id);

    if (error) {
        console.error(`❌ Failed to reward referrer (${refUser.id}):`, error.message);
    } else {
        console.log(`✅ Referrer (${refUser.id}) rewarded successfully.`);
    }
};