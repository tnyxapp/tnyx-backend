const admin = require("../config/firebase");
const mongoose = require("mongoose");
const User = require("../models/User");
const Device = require("../models/Device");

exports.signupService = async (data) => {
    let {
        email, password, name, goals, gender, dob, height,
        current_weight, target_weight, activityLevel, mobile,
        gymAccess, equipment, focusAreas, trainingDays,
        workoutDuration, workoutSplit, stepTarget, sleepTarget,
        waterTarget, referral, aboutUs, membership,
        authProvider = "email", firebaseUid,
        deviceId 
    } = data;

    // 🔥 sanitize
    email = email?.toLowerCase().trim();
    name = name?.trim();

    // 🔥 provider based validation
    if (authProvider === "email") {
        if (!email || !password) throw new Error("Email and password are required");
        if (password.length < 6) throw new Error("Password must be at least 6 characters");
    }
    if (authProvider === "truecaller") {
        if (!/^[6-9]\d{9}$/.test(mobile)) throw new Error("Invalid mobile number");
    }
    if (authProvider === "google") {
        if (!email || !firebaseUid) throw new Error("Google authentication failed");
    }

    // 🔍 find user (email OR mobile)
    let user = await User.findOne({
        $or: [
            email ? { email } : null,
            mobile ? { mobile } : null
        ].filter(Boolean)
    });

    if (user && email && user.email && user.email !== email && authProvider !== "email") {
        throw new Error("Email already linked with another account");
    }
    if (user && user.isDeleted) {
        throw new Error("Account deleted. Please recover your account");
    }

    // ==========================================
    // 🔥 DEVICE & ANTI-ABUSE CHECK
    // ==========================================
    let deviceRecord = null;
    let applyTrial = false;
    let appliedReferral = false;
    let refUser = null;

    if (deviceId) {
        deviceRecord = await Device.findOne({ deviceId });
        if (!deviceRecord) {
            deviceRecord = new Device({ deviceId });
        }
    }

    if (!user) {
        // Trial Check
        if (deviceId && deviceRecord?.trialUsed) {
            throw new Error("Trial already used on this device. Please login or upgrade.");
        }
        applyTrial = true;

        // Referral Check
        if (referral) {
            if (deviceId && deviceRecord?.referralUsed) {
                throw new Error("Referral already used on this device.");
            }
            refUser = await User.findOne({ referralCode: referral });
            if (refUser) {
                appliedReferral = true;
            }
        }
    }

    // ==========================================
    // 🔥 FIREBASE USER CREATION LOGIC
    // ==========================================
    let firebaseUser;
    let isNewUser = false;

    if (authProvider === "email") {
        try {
            firebaseUser = await admin.auth().getUserByEmail(email);
        } catch (err) {
            if (err.code === "auth/user-not-found") {
                firebaseUser = await admin.auth().createUser({ email, password, displayName: name });
            } else throw new Error("Firebase error: " + err.message);
        }
    }

    if (authProvider === "truecaller") {
        try {
            firebaseUser = await admin.auth().getUserByPhoneNumber(`+91${mobile}`);
        } catch (err) {
            if (err.code === "auth/user-not-found") {
                firebaseUser = await admin.auth().createUser({
                    phoneNumber: `+91${mobile}`,
                    displayName: name || "Truecaller User",
                });
            } else throw new Error("Firebase error (Truecaller): " + err.message);
        }
    }

    if (authProvider === "google") {
        firebaseUser = { uid: firebaseUid };
    }

    // 🔥 MONGODB UPDATE OR CREATE
    const safeNumber = (val) => isNaN(Number(val)) ? 0 : Number(val);
    const validPlans = ["free", "pro", "premium"];
    const plan = validPlans.includes(membership) ? membership : "free";

    const planConfig = {
        free: { credits: 10, limit: 10 },
        pro: { credits: 100, limit: 100 },
        premium: { credits: 500, limit: 500 }
    };

    const selectedPlan = planConfig[plan];

    // 🔄 UPDATE EXISTING USER
    if (user) {
        user.name = name || user.name || "User";
        user.email = email || user.email;
        user.mobile = mobile || user.mobile;
        
        if (!user.authProvider) user.authProvider = authProvider;
        if (firebaseUser?.uid && !user.firebaseUid) user.firebaseUid = firebaseUser.uid;
        if (deviceId && !user.deviceId) user.deviceId = deviceId;

        user.goals = Array.isArray(goals) ? goals : user.goals;
        user.gender = gender || user.gender;
        user.dob = dob || user.dob;
        if (current_weight !== undefined) user.current_weight = safeNumber(current_weight);
        if (target_weight !== undefined) user.target_weight = safeNumber(target_weight);
        user.activityLevel = activityLevel || user.activityLevel;

        user.gymAccess = gymAccess ?? user.gymAccess;
        
        // 👉 ARRAY SAFETY APPLIED HERE
        user.equipment = Array.isArray(equipment) ? equipment : user.equipment;
        user.focusAreas = Array.isArray(focusAreas) ? focusAreas : user.focusAreas;
        user.trainingDays = Array.isArray(trainingDays) ? trainingDays : user.trainingDays;
        
        user.workoutDuration = workoutDuration || user.workoutDuration;
        user.workoutSplit = workoutSplit || user.workoutSplit;

        if (stepTarget !== undefined) user.stepTarget = Number(stepTarget);
        if (sleepTarget !== undefined) user.sleepTarget = Number(sleepTarget);
        if (waterTarget !== undefined) user.waterTarget = Number(waterTarget);

        user.referral = referral || user.referral;
        user.aboutUs = aboutUs || user.aboutUs;
        
        if (membership && validPlans.includes(membership)) {
            user.membership = membership;
            user.aiPlan = membership;
        }

        if (user.aiCredits === 0 && user.aiUsed === 0) {
            user.aiPlan = plan;
            user.aiCredits = selectedPlan.credits;
            user.aiTotalLimit = selectedPlan.limit;
            user.aiUsed = 0;
        }

        await user.save();
    } 
    // 🆕 CREATE NEW USER
    else {
        const newUserId = new mongoose.Types.ObjectId();
        const generatedReferralCode = newUserId.toString().slice(-6).toUpperCase();
        
        let startingCredits = selectedPlan.credits;
        if (appliedReferral) {
            startingCredits += 5;
        }

        user = new User({
            _id: newUserId,
            firebaseUid: firebaseUser?.uid || null,
            authProvider,
            deviceId: deviceId || null,
            
            email: email || null,
            mobile: mobile || null,
            name: name || "User",

            goals: Array.isArray(goals) ? goals : [],
            gender: gender || "",
            dob: dob || null,
            height: safeNumber(height),
            current_weight: safeNumber(current_weight),
            target_weight: safeNumber(target_weight),
            activityLevel: activityLevel || "",

            gymAccess: gymAccess ?? false,  
            // 👉 ARRAY SAFETY APPLIED HERE
            equipment: Array.isArray(equipment) ? equipment : [],
            focusAreas: Array.isArray(focusAreas) ? focusAreas : [],
            trainingDays: Array.isArray(trainingDays) ? trainingDays : [],
            
            workoutDuration: workoutDuration || "",
            workoutSplit: workoutSplit || "",

            stepTarget: Number(stepTarget) || 0,
            sleepTarget: Number(sleepTarget) || 0,
            waterTarget: Number(waterTarget) || 0,

            referralCode: generatedReferralCode,
            referredBy: appliedReferral ? refUser._id : null,
            referral: referral || "",

            aboutUs: aboutUs || "",
            membership: plan,

            trialStart: null,
            trialEnd: null,
            isTrialUsed: deviceRecord?.trialUsed || false, // सिर्फ यह ट्रैक करें कि पहले इस्तेमाल हुआ या नहीं

            aiPlan: plan,
            aiCredits: selectedPlan.credits, // डिफ़ॉल्ट फ्री क्रेडिट्स
            aiTotalLimit: selectedPlan.limit,
            aiUsed: 0
        });

        try {
            await user.save();
            isNewUser = true;

            if (deviceId && deviceRecord) {
                if (applyTrial) deviceRecord.trialUsed = true;
                if (appliedReferral) deviceRecord.referralUsed = true;
                await deviceRecord.save();
            }

            if (appliedReferral && refUser) {
                refUser.aiCredits += 5;
                refUser.referralCount += 1;
                await refUser.save();
            }

        } catch (err) {
            // 👉 🔥 LOGGING EXACT ERROR IN CONSOLE FOR DEBUGGING
            console.error("🔴 MONGODB SAVE ERROR:", err);

            // 🔥 ROLLBACK
            if ((authProvider === "email" || authProvider === "truecaller") && firebaseUser?.uid) {
                try {
                    await admin.auth().deleteUser(firebaseUser.uid);
                } catch (rollbackErr) {
                    console.error("Rollback failed:", rollbackErr);
                }
            }
            throw new Error("Database error. Signup failed");
        }
    }

    let customToken = null;
    if (authProvider === "truecaller" && user.firebaseUid) {
        try {
            customToken = await admin.auth().createCustomToken(user.firebaseUid);
        } catch (error) {
            console.error("Custom token creation failed:", error);
        }
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
            trialEnd: user.trialEnd
        }
    };
};