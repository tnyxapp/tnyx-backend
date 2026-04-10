// services/signupService.js (या authService.js)
const mongoose = require("mongoose");
const User = require("../models/User");
const admin = require("../config/firebase");

// 🔥 अपने नए Helpers को इम्पोर्ट करो
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

    // 2. Check Existing User
    let user = await User.findOne({ $or: [ email ? { email } : null, mobile ? { mobile } : null ].filter(Boolean) });
    if (user && email && user.email && user.email !== email && authProvider !== "email") throw new Error("Email linked with another account");
    if (user && user.isDeleted) throw new Error("Account deleted. Please recover.");

    // 3. Referral & Device Check (Helper Call)
    const { deviceRecord, refUser, appliedReferral } = await checkReferralAndDevice(deviceId, !user ? referral : null);

    // 4. Firebase & Profile Image (Helper Call)
    const { firebaseUser, profileImage } = await handleFirebaseUser(data);

    // 5. Plan Config
    const planConfig = { free: { credits: 10, limit: 10 }, pro: { credits: 100, limit: 100 }, premium: { credits: 500, limit: 500 } };
    const safeNumber = (val) => isNaN(Number(val)) ? 0 : Number(val);
    const plan = ["free", "pro", "premium"].includes(membership) ? membership : "free";

    let isNewUser = false;

    // ==========================================
    // 🟢 UPDATE OR CREATE MONGODB USER
    // ==========================================
    if (user) {
        user.name = name || user.name || "User";
        user.email = email || user.email;
        user.mobile = mobile || user.mobile;
        if (!user.authProvider) user.authProvider = authProvider;
        if (firebaseUser?.uid && !user.firebaseUid) user.firebaseUid = firebaseUser.uid;
        if (deviceId && !user.deviceId) user.deviceId = deviceId; 

        // Update basic fitness stats
        user.gender = data.gender || user.gender;
        user.dob = data.dob || user.dob;
        user.activityLevel = data.activityLevel || user.activityLevel;
        if (data.current_weight) user.current_weight = safeNumber(data.current_weight);
        if (data.target_weight) user.target_weight = safeNumber(data.target_weight);
        
        if (user.aiCredits === 0 && user.aiUsed === 0) {
            user.aiPlan = plan;
            user.aiCredits = planConfig[plan].credits;
            user.aiTotalLimit = planConfig[plan].limit;
        }
        await user.save();
    } 
    else {
        const newUserId = new mongoose.Types.ObjectId(); 
        let assignedAiPlan = plan;
        let trialStart = null, trialEnd = null, isTrialUsed = false;

        // Apply Referral Reward (New User)
        if (appliedReferral) {
            trialStart = new Date();
            trialEnd = new Date(trialStart.getTime() + 7 * 24 * 60 * 60 * 1000);
            isTrialUsed = true; 
            assignedAiPlan = "pro"; 
        }

        user = new User({
            _id: newUserId,
            firebaseUid: firebaseUser?.uid || null,
            profileImage, email, mobile, authProvider, deviceId,
            name: name || "User",
            referralCode: newUserId.toString().slice(-6).toUpperCase(),
            referredBy: appliedReferral ? refUser._id : null,
            referral: referral || "",
            
            trialStart, trialEnd, isTrialUsed,
            membership: "free",
            aiPlan: assignedAiPlan,
            aiCredits: planConfig[assignedAiPlan].credits,
            aiTotalLimit: planConfig[assignedAiPlan].limit,
            aiUsed: 0,

            // Fitness Data
            goals: data.goals || [],
            gender: data.gender || "",
            dob: data.dob || null,
            height: safeNumber(data.height),
            current_weight: safeNumber(data.current_weight),
            target_weight: safeNumber(data.target_weight),
            activityLevel: data.activityLevel || "",
            gymAccess: data.gymAccess ?? false,
            trainingDays: Array.isArray(data.trainingDays) ? data.trainingDays : []
        });

        try {
            await user.save();
            isNewUser = true;

            // Device Record update
            if (deviceId && deviceRecord && appliedReferral) {
                deviceRecord.referralUsed = true;
                await deviceRecord.save();
            }

            // Reward Old User (Helper Call)
            if (appliedReferral && refUser) {
                await rewardReferrer(refUser, planConfig);
            }

        } catch (err) {
            console.error("🔴 MONGODB SAVE ERROR:", err);
            if ((authProvider === "email" || authProvider === "truecaller") && firebaseUser?.uid) {
                try { await admin.auth().deleteUser(firebaseUser.uid); } catch (e) {}
            }
            throw new Error("Database error. Signup failed");
        }
    }

    // Generate Custom Token for Truecaller
    let customToken = null;
    if (authProvider === "truecaller" && user.firebaseUid) {
        try { customToken = await admin.auth().createCustomToken(user.firebaseUid); } catch (e) {}
    }

    return {
        success: true,
        message: isNewUser ? "Account created" : "Account synced",
        isNewUser,
        customToken,
        user: {
            id: user._id,
            referralCode: user.referralCode,
            aiCredits: user.aiCredits,
            aiPlan: user.aiPlan,
            isTrialUsed: user.isTrialUsed
        }
    };
};