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
        deviceId // 🔥 Frontend से deviceId आएगा
    } = data;

    email = email?.toLowerCase().trim();
    name = name?.trim();

    // Provider based validation...
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
    // 🔥 DEVICE & REFERRAL CHECK (Trial Block हटा दिया गया है)
    // ==========================================
    let deviceRecord = null;
    let appliedReferral = false;
    let refUser = null;

    if (deviceId) {
        deviceRecord = await Device.findOne({ deviceId });
        if (!deviceRecord) {
            deviceRecord = new Device({ deviceId });
        }
    }

    if (!user) {
        // 🔥 सिर्फ Referral Check होगा, Trial Check हटा दिया गया है
        if (referral) {
            if (deviceId && deviceRecord?.referralUsed) {
                // Referral ब्लॉक कर सकते हैं, लेकिन Signup नहीं रोकेंगे
                console.warn("Referral already used on this device.");
            } else {
                refUser = await User.findOne({ referralCode: referral });
                if (refUser) appliedReferral = true;
            }
        }
    }

    // ==========================================
    // 🔥 FIREBASE LOGIC 
    // ==========================================
    let firebaseUser;
    let isNewUser = false;

    if (authProvider === "email") {
        try { firebaseUser = await admin.auth().getUserByEmail(email); } 
        catch (err) {
            if (err.code === "auth/user-not-found") firebaseUser = await admin.auth().createUser({ email, password, displayName: name });
            else throw new Error("Firebase error: " + err.message);
        }
    }
    if (authProvider === "truecaller") {
        try { firebaseUser = await admin.auth().getUserByPhoneNumber(`+91${mobile}`); } 
        catch (err) {
            if (err.code === "auth/user-not-found") firebaseUser = await admin.auth().createUser({ phoneNumber: `+91${mobile}`, displayName: name || "Truecaller User" });
            else throw new Error("Firebase error: " + err.message);
        }
    }
    if (authProvider === "google") { firebaseUser = { uid: firebaseUid }; }

    // MONGODB UPDATE OR CREATE
    const safeNumber = (val) => isNaN(Number(val)) ? 0 : Number(val);
    const validPlans = ["free", "pro", "premium"];
    const plan = validPlans.includes(membership) ? membership : "free";

    const planConfig = {
        free: { credits: 10, limit: 10 },
        pro: { credits: 100, limit: 100 },
        premium: { credits: 500, limit: 500 }
    };

    const selectedPlan = planConfig[plan];

    if (user) {
        // Update existing user...
        user.name = name || user.name || "User";
        user.email = email || user.email;
        user.mobile = mobile || user.mobile;
        
        if (!user.authProvider) user.authProvider = authProvider;
        if (firebaseUser?.uid && !user.firebaseUid) user.firebaseUid = firebaseUser.uid;
        if (deviceId && !user.deviceId) user.deviceId = deviceId; 

        user.goals = goals || user.goals;
        user.gender = gender || user.gender;
        user.dob = dob || user.dob;
        if (current_weight !== undefined) user.current_weight = safeNumber(current_weight);
        if (target_weight !== undefined) user.target_weight = safeNumber(target_weight);
        user.activityLevel = activityLevel || user.activityLevel;

        user.gymAccess = gymAccess ?? user.gymAccess;
        user.equipment = equipment || user.equipment;
        user.focusAreas = focusAreas || user.focusAreas;
        user.trainingDays = Array.isArray(trainingDays) ? trainingDays : []; // Safe handling
        user.workoutDuration = workoutDuration || user.workoutDuration;
        user.workoutSplit = workoutSplit || user.workoutSplit;

        if (stepTarget !== undefined) user.stepTarget = Number(stepTarget);
        if (sleepTarget !== undefined) user.sleepTarget = Number(sleepTarget);
        if (waterTarget !== undefined) user.waterTarget = Number(waterTarget);

        user.aboutUs = aboutUs || user.aboutUs;
        
        if (user.aiCredits === 0 && user.aiUsed === 0) {
            user.aiPlan = plan;
            user.aiCredits = selectedPlan.credits;
            user.aiTotalLimit = selectedPlan.limit;
            user.aiUsed = 0;
        }

        await user.save();
    } 
    else {
        const newUserId = new mongoose.Types.ObjectId(); 
        const generatedReferralCode = newUserId.toString().slice(-6).toUpperCase();
        
        let startingCredits = selectedPlan.credits;
        if (appliedReferral) startingCredits += 5; 

        user = new User({
            _id: newUserId,
            firebaseUid: firebaseUser?.uid || null,
            email: email || null,
            mobile: mobile || null,
            name: name || "User",
            authProvider,
            deviceId: deviceId || null,

            referralCode: generatedReferralCode,
            referredBy: appliedReferral ? refUser._id : null,
            referral: referral || "",

            // 🔥 Trial is NO LONGER activated on signup automatically
            trialStart: null,
            trialEnd: null,
            isTrialUsed: false,

            goals: goals || [],
            gender: gender || "",
            dob: dob || null,
            height: safeNumber(height),
            current_weight: safeNumber(current_weight),
            target_weight: safeNumber(target_weight),
            activityLevel: activityLevel || "",

            gymAccess: gymAccess ?? false,
            equipment: equipment || [],
            focusAreas: focusAreas || [],
            trainingDays: Array.isArray(trainingDays) ? trainingDays : [],
            workoutDuration: workoutDuration || "",
            workoutSplit: workoutSplit || "",

            stepTarget: Number(stepTarget) || 0,
            sleepTarget: Number(sleepTarget) || 0,
            waterTarget: Number(waterTarget) || 0,

            aboutUs: aboutUs || "",
            membership: plan,

            aiPlan: plan,
            aiCredits: startingCredits,
            aiTotalLimit: selectedPlan.limit,
            aiUsed: 0
        });

        try {
            await user.save();
            isNewUser = true;

            // Update Device Record (Only marking referral, not trial)
            if (deviceId && deviceRecord) {
                if (appliedReferral) deviceRecord.referralUsed = true;
                await deviceRecord.save();
            }

            if (appliedReferral && refUser) {
                refUser.aiCredits += 5;
                refUser.referralCount += 1;
                await refUser.save();
            }

        } catch (err) {
            console.error("🔴 MONGODB SAVE ERROR:", err);
            if ((authProvider === "email" || authProvider === "truecaller") && firebaseUser?.uid) {
                try { await admin.auth().deleteUser(firebaseUser.uid); } catch (e) {}
            }
            throw new Error("Database error. Signup failed");
        }
    }

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
            isTrialUsed: user.isTrialUsed
        }
    };
};