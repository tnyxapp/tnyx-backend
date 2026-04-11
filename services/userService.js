// services/userService.js
const admin = require("../config/firebase");
const supabase = require("../config/supabase"); // 🔥 Supabase Import

// ✅ DELETE ACCOUNT (soft delete + safe)
exports.deleteAccountService = async (uid) => {
    if (!uid) {
        throw new Error("Unauthorized");
    }

    const { data: user } = await supabase.from('users').select('*').eq('firebase_uid', uid).maybeSingle();

    if (!user) {
        throw new Error("User not found");
    }

    if (user.is_deleted) {
        throw new Error("Account already deleted");
    }

    // 🔥 soft delete in Supabase
    await supabase.from('users').update({ 
        is_deleted: true, 
        deleted_at: new Date() 
    }).eq('id', user.id);

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

    const { data: user } = await supabase.from('users').select('*').eq('email', email).maybeSingle();

    if (!user) {
        throw new Error("User not found");
    }

    if (!user.is_deleted) {
        throw new Error("Account is already active");
    }

    if (!user.deleted_at) {
        throw new Error("Invalid delete state");
    }

    // 🔥 recovery window (7 days)
    const diff = Date.now() - new Date(user.deleted_at).getTime();
    const days = diff / (1000 * 60 * 60 * 24);

    if (days > 7) {
        throw new Error("Recovery period expired. Please signup again");
    }

    // 🔥 restore in Supabase
    await supabase.from('users').update({ 
        is_deleted: false, 
        deleted_at: null 
    }).eq('id', user.id);

    // 🔥 enable Firebase user (direct UID)
    await admin.auth().updateUser(user.firebase_uid, { disabled: false });

    return {
        success: true,
        message: "Account recovered successfully ✅"
    };
};