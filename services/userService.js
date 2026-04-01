const admin = require("../config/firebase");
const User = require("../models/User");


// ✅ DELETE ACCOUNT (soft delete + safe)
exports.deleteAccountService = async (token) => {

    if (!token) {
        throw new Error("Unauthorized");
    }

    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;

    const user = await User.findOne({ firebaseUid: uid });

    if (!user) {
        throw new Error("User not found");
    }

    // 🔥 already deleted check
    if (user.isDeleted) {
        throw new Error("Account already deleted");
    }

    // 🔥 soft delete
    user.isDeleted = true;
    user.deletedAt = new Date();

    // optional: clear sensitive data (pro level)
    // user.mobile = "";
    // user.extra = {};

    await user.save();

    // 🔥 disable firebase login
    await admin.auth().updateUser(uid, { disabled: true });

    return {
        success: true,
        message: "Account deleted. You can recover within 7 days"
    };
};



// ✅ RECOVER ACCOUNT (secure version)
exports.recoverAccountService = async (email) => {

    if (!email) {
        throw new Error("Email is required");
    }

    const user = await User.findOne({ email });

    if (!user) {
        throw new Error("User not found");
    }

    if (!user.isDeleted) {
        throw new Error("Account is already active");
    }

    // 🔥 recovery window check (7 days)
    const diff = Date.now() - new Date(user.deletedAt).getTime();
    const days = diff / (1000 * 60 * 60 * 24);

    if (days > 7) {
        throw new Error("Recovery period expired. Please signup again");
    }

    // 🔥 restore account
    user.isDeleted = false;
    user.deletedAt = null;

    await user.save();

    // 🔥 enable firebase user
    let firebaseUser;
    try {
        firebaseUser = await admin.auth().getUserByEmail(email);
    } catch (err) {
        throw new Error("Firebase user not found");
    }

    await admin.auth().updateUser(firebaseUser.uid, { disabled: false });

    return {
        success: true,
        message: "Account recovered successfully ✅"
    };
};