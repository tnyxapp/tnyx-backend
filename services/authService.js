const admin = require("../config/firebase");
const User = require("../models/User");

exports.signupService = async (data) => {

    let {
        email,
        password,
        name,
        goals,
        gender,
        dob,
        height,
        weight,
        activityLevel,
        mobile,

        // 🔥 NEW FIELDS
        gymAccess,
        equipment,
        focusAreas,
        trainingDays,
        workoutDuration,
        workoutSplit,
        stepTarget,
        sleepTarget,
        waterTarget,
        referral,
        aboutUs,
        membership,

        authProvider = "email",
        firebaseUid
    } = data; = data;

    // 🔥 sanitize
    email = email?.toLowerCase().trim();
    name = name?.trim();

    // 🔥 provider based validation
    if (authProvider === "email") {
        if (!email || !password) {
            throw new Error("Email and password are required");
        }

        if (password.length < 6) {
            throw new Error("Password must be at least 6 characters");
        }
    }

    if (authProvider === "truecaller") {
        if (!/^[6-9]\d{9}$/.test(mobile)) {
            throw new Error("Invalid mobile number");
        }
    }

    if (authProvider === "google") {
        if (!email || !firebaseUid) {
            throw new Error("Google authentication failed");
        }
    }

    // 🔥 find user (email OR mobile)
    let user = await User.findOne({
        $or: [
            email ? { email } : null,
            mobile ? { mobile } : null
        ].filter(Boolean)
    });

    // 🔥 prevent email conflict (ADD HERE)
    if (
        user &&
        email &&
        user.email &&
        user.email !== email &&
        authProvider !== "email"
    ) {
        throw new Error("Email already linked with another account");
    }

    if (user && user.isDeleted) {
        throw new Error("Account deleted. Please recover your account");
    }

    let firebaseUser;
    let isNewUser = false;

    // 🔥 Firebase only for email/google
    if (authProvider === "email") {
    try {
        // 🔥 check Firebase user
        firebaseUser = await admin.auth().getUserByEmail(email);

        // 👉 Firebase user exists
        // Mongo decide करेगा new या existin
    } catch (err) {

        if (err.code === "auth/user-not-found") {

            try {
                // 🔥 create Firebase user
                firebaseUser = await admin.auth().createUser({
                    email,
                    password,
                    displayName: name,
                });

            } catch (createErr) {
                throw new Error("Firebase create error: " + createErr.message);
            }

        } else {
            throw new Error("Firebase error: " + err.message);
        }
    }
}

    if (authProvider === "google") {
        firebaseUser = { uid: firebaseUid }; // already verified
    }

    // 🔥 Safe number conversion
    const safeNumber = (val) => isNaN(Number(val)) ? 0 : Number(val);

    // 🔥 UPDATE USER
    if (user) {

        user.name = name || user.name || "User";
        user.email = email || user.email;
        user.mobile = mobile || user.mobile;

        if (!user.authProvider) {
            user.authProvider = authProvider;
        }

        if (firebaseUser?.uid && !user.firebaseUid) {
            user.firebaseUid = firebaseUser.uid;
        }

        user.goals = goals || user.goals;
        user.gender = gender || user.gender;
        user.dob = dob || user.dob;

        if (height !== undefined) user.height = safeNumber(height);
        if (weight !== undefined) user.weight = safeNumber(weight);

        user.activityLevel = activityLevel || user.activityLevel;

        // 🔥 WORKOUT
        user.gymAccess = gymAccess ?? user.gymAccess;
        user.equipment = equipment || user.equipment;
        user.focusAreas = focusAreas || user.focusAreas;
        user.trainingDays = trainingDays || user.trainingDays;
        user.workoutDuration = workoutDuration || user.workoutDuration;
        user.workoutSplit = workoutSplit || user.workoutSplit;

        // 🔥 TARGET
        if (stepTarget !== undefined) user.stepTarget = Number(stepTarget);
        if (sleepTarget !== undefined) user.sleepTarget = Number(sleepTarget);
        if (waterTarget !== undefined) user.waterTarget = Number(waterTarget);

        // 🔥 SOURCE
        user.referral = referral || user.referral;
        user.aboutUs = aboutUs || user.aboutUs;
        user.membership = membership || user.membership;

        await user.save();
    } else {

        user = new User({
            firebaseUid: firebaseUser?.uid || null,
            email: email || null,
            mobile: mobile || null,
            name: name || "User",
            authProvider,

            goals: goals || [],
            gender: gender || "",
            dob: dob || null,
            height: safeNumber(height),
            weight: safeNumber(weight),
            activityLevel: activityLevel || "",

            // 🔥 WORKOUT
            gymAccess: gymAccess ?? false,
            equipment: equipment || [],
            focusAreas: focusAreas || [],
            trainingDays: trainingDays || [],
            workoutDuration: workoutDuration || "",
            workoutSplit: workoutSplit || "",

            // 🔥 TARGET
            stepTarget: Number(stepTarget) || 0,
            sleepTarget: Number(sleepTarget) || 0,
            waterTarget: Number(waterTarget) || 0,

            // 🔥 SOURCE
            referral: referral || "",
            aboutUs: aboutUs || "",
            membership: membership || ""
        });

        try {
            await user.save();
            isNewUser = true;
        } catch (err) {

            // 🔥 rollback only if firebase created
            if (authProvider === "email" && firebaseUser?.uid) {
                await admin.auth().deleteUser(firebaseUser.uid);
            }

            throw new Error("Database error. Signup failed");
        }
    }

    return {
        success: true,
        message: isNewUser ? "Account created" : "Account synced",
        isNewUser
    };
};