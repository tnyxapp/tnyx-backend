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
        mobile
    } = data;

    // 🔥 sanitize
    email = email?.toLowerCase().trim();
    name = name?.trim();

    // 🔥 validation
    if (!email || !password) {
        throw new Error("Email, password are required");
    }

    if (password.length < 6) {
        throw new Error("Password must be at least 6 characters");
    }

    // 🔥 Mongo check
    let user = await User.findOne({ email });

    if (user && user.isDeleted) {
        throw new Error("Account deleted. Please recover your account");
    }

    let firebaseUser;
    let isNewUser = false;

    // 🔥 Firebase check/create (safe)
    try {
        firebaseUser = await admin.auth().getUserByEmail(email);
    } catch (err) {

        if (err.code === "auth/user-not-found") {
            firebaseUser = await admin.auth().createUser({
                email,
                password,
                displayName: name,
            });
            isNewUser = true;
        } else {
            throw new Error("Firebase error: " + err.message);
        }
    }

    // 🔥 Safe number conversion
    const safeNumber = (val) => isNaN(Number(val)) ? 0 : Number(val);

    // 🔥 Update existing Mongo user
    if (user) {

        user.name = name;
        user.goals = goals || [];
        user.gender = gender || "";
        user.dob = dob || "";
        user.height = safeNumber(height);
        user.weight = safeNumber(weight);
        user.activityLevel = activityLevel || "";
        user.mobile = mobile || "";

        await user.save();

    } else {

        // 🔥 Create new Mongo user
        user = new User({
            firebaseUid: firebaseUser.uid,
            email,
            name,
            goals: goals || [],
            gender: gender || "",
            dob: dob || "",
            height: safeNumber(height),
            weight: safeNumber(weight),
            activityLevel: activityLevel || "",
            mobile: mobile || ""
        });

        try {
            await user.save();
            isNewUser = true;
        } catch (err) {

            // 🔥 rollback Firebase user if Mongo fails
            if (firebaseUser?.uid) {
                await admin.auth().deleteUser(firebaseUser.uid);
            }

            throw new Error("Database error. Signup failed");
        }
    }

    return {
        success: true,
        message: isNewUser ? "New user created ✅" : "User updated ✅",
        isNewUser
    };
};