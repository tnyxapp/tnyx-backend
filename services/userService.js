const admin = require("../config/firebase");
const User = require("../models/User");


// ✅ DELETE ACCOUNT (soft delete + safe)
exports.deleteAccountService = async (uid) => {

    if (!uid) {
        throw new Error("Unauthorized");
    }

    const user = await User.findOne({ firebaseUid: uid });

    if (!user) {
        throw new Error("User not found");
    }

    if (user.isDeleted) {
        throw new Error("Account already deleted");
    }

    // 🔥 soft delete
    user.isDeleted = true;
    user.deletedAt = new Date();

    await user.save();

    // 🔥 disable Firebase login
    await admin.auth().updateUser(uid, { disabled: true });

    // 🔥 revoke sessions (important)
    await admin.auth().revokeRefreshTokens(uid);

    return {
        success: true,
        message: "Account deleted. You can recover within 7 days"
    };
};



// ✅ RECOVER ACCOUNT (secure version)
exports.recoverAccountService = async (email) => {

    email = email?.toLowerCase().trim();

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

    if (!user.deletedAt) {
        throw new Error("Invalid delete state");
    }

    // 🔥 recovery window (7 days)
    const diff = Date.now() - new Date(user.deletedAt).getTime();
    const days = diff / (1000 * 60 * 60 * 24);

    if (days > 7) {
        throw new Error("Recovery period expired. Please signup again");
    }

    // 🔥 restore
    user.isDeleted = false;
    user.deletedAt = null;

    await user.save();

    // 🔥 enable Firebase user (direct UID)
    await admin.auth().updateUser(user.firebaseUid, { disabled: false });

    return {
        success: true,
        message: "Account recovered successfully ✅"
    };
};