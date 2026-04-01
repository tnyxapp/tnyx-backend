const admin = require("../config/firebase");
const User = require("../models/User");

exports.signupService = async (data) => {

    const {
        email,
        password,
        name,
        goals,
        gender,
        dob,
        height,
        weight,
        activityLevel,
        mobile
    } = data;

    // 🔥 1. Basic validation
    if (!email || !password || !name) {
        throw new Error("Email, password and name are required");
    }

    if (password.length < 6) {
        throw new Error("Password must be at least 6 characters");
    }

    // 🔥 2. Check Mongo first (IMPORTANT)
    let user = await User.findOne({ email });

    if (user && user.isDeleted) {
        throw new Error("Account deleted. Please recover your account");
    }

    let firebaseUser;
    let isNewUser = false;

    // 🔥 3. Firebase user check/create
    try {
        firebaseUser = await admin.auth().getUserByEmail(email);
    } catch (err) {
        firebaseUser = await admin.auth().createUser({
            email,
            password,
            displayName: name,
        });
        isNewUser = true;
    }

    // 🔥 4. Update existing user
    if (user) {

        user.name = name?.trim();
        user.goals = goals || [];
        user.gender = gender || "";
        user.dob = dob || "";
        user.height = Number(height) || 0;
        user.weight = Number(weight) || 0;
        user.activityLevel = activityLevel || "";
        user.mobile = mobile || "";

        await user.save();

    } else {

        // 🔥 5. Create new user
        user = new User({
            firebaseUid: firebaseUser.uid,
            email,
            name: name.trim(),
            goals: goals || [],
            gender: gender || "",
            dob: dob || "",
            height: Number(height) || 0,
            weight: Number(weight) || 0,
            activityLevel: activityLevel || "",
            mobile: mobile || ""
        });

        await user.save();
        isNewUser = true;
    }

    return {
        success: true,
        message: isNewUser ? "New user created ✅" : "User updated ✅",
        isNewUser
    };
};