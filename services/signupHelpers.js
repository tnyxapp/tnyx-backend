// services/signupHelpers.js
const admin = require("../config/firebase");
const User = require("../models/User");
const Device = require("../models/Device");

// 1. Firebase Auth & Profile Photo Helper
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

// 2. Check Device & Valid Referral Code
exports.checkReferralAndDevice = async (deviceId, referralCode) => {
    let deviceRecord = null;
    let appliedReferral = false;
    let refUser = null;

    if (deviceId) {
        deviceRecord = await Device.findOne({ deviceId });
        if (!deviceRecord) deviceRecord = new Device({ deviceId });
    }

    if (referralCode) {
        if (deviceId && deviceRecord?.referralUsed) {
            console.warn("Referral already used on this device.");
        } else {
            refUser = await User.findOne({ referralCode: referralCode });
            if (refUser) appliedReferral = true;
        }
    }
    return { deviceRecord, refUser, appliedReferral };
};

// 3. Reward Old User (Referrer)
exports.rewardReferrer = async (refUser, planConfig) => {
    if (!refUser) return;
    const now = new Date();
    
    if (refUser.trialEnd && refUser.trialEnd > now) {
        // Extend Pro by 7 days
        refUser.trialEnd = new Date(refUser.trialEnd.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else {
        // Start new 7-Day Pro
        refUser.trialStart = now;
        refUser.trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        refUser.aiPlan = "pro"; 
    }

    refUser.referralCount += 1;
    refUser.aiCredits = planConfig["pro"].credits; 
    refUser.aiTotalLimit = planConfig["pro"].limit;

    await refUser.save();
};