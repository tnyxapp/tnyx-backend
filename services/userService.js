// services/userService.js
const admin = require("../config/firebase");
const supabase = require("../config/supabase"); // 🔥 Supabase Import

// ==========================================
// ✅ DELETE ACCOUNT (Soft Delete + Safe Rollback)
// ==========================================
exports.deleteAccountService = async (uid) => {
    if (!uid) {
        const err = new Error("Unauthorized"); err.statusCode = 401; throw err;
    }

    // 🚨 FIX: Removed select('*')
    const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('id, is_deleted, firebase_uid')
        .eq('firebase_uid', uid)
        .maybeSingle();

    if (fetchError || !user) {
        const err = new Error("User not found"); err.statusCode = 404; throw err;
    }

    if (user.is_deleted) {
        const err = new Error("Account already deleted"); err.statusCode = 400; throw err;
    }

    const deleteTimestamp = new Date().toISOString();

    // 1️⃣ Database Update
    const { error: dbError } = await supabase.from('users').update({ 
        is_deleted: true, 
        deleted_at: deleteTimestamp 
    }).eq('id', user.id);

    if (dbError) throw new Error("Database update failed. Please try again.");

    // 2️⃣ Firebase Update (🚨 FIX 3: Transaction / Rollback Logic)
    try {
        await admin.auth().updateUser(uid, { disabled: true });
        await admin.auth().revokeRefreshTokens(uid);
    } catch (firebaseError) {
        console.error("❌ Firebase Delete Error, Rolling back DB:", firebaseError.message);
        
        // 🔄 ROLLBACK: अगर Firebase फेल हुआ, तो DB को वापस Active कर दो
        await supabase.from('users').update({ 
            is_deleted: false, 
            deleted_at: null 
        }).eq('id', user.id);

        const err = new Error("Failed to securely disable account. Try again.");
        err.statusCode = 500;
        throw err;
    }

    return {
        success: true,
        message: "Account deleted. You can recover within 7 days"
    };
};

// ==========================================
// ✅ RECOVER ACCOUNT (Secure + Rollback)
// ==========================================
// 🚨 FIX 1: OTP Controller में वेरिफाई होने के बाद ही यह सर्विस कॉल होनी चाहिए!
exports.recoverAccountService = async (email) => {
    email = email?.toLowerCase().trim();

    if (!email) {
        const err = new Error("Email is required"); err.statusCode = 400; throw err;
    }

    // 🚨 FIX: Removed select('*')
    const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('id, is_deleted, deleted_at, firebase_uid')
        .eq('email', email)
        .maybeSingle();

    if (fetchError || !user) {
        const err = new Error("User not found"); err.statusCode = 404; throw err;
    }

    if (!user.is_deleted || !user.deleted_at) {
        const err = new Error("Account is already active or in an invalid state"); 
        err.statusCode = 400; 
        throw err;
    }

    // 🚨 FIX 2: Check for Firebase UID before making Auth calls
    if (!user.firebase_uid) {
        const err = new Error("Critical Error: Firebase UID missing for this account");
        err.statusCode = 500;
        throw err;
    }

    // 🔥 Recovery window (7 days)
    const diff = Date.now() - new Date(user.deleted_at).getTime();
    const days = diff / (1000 * 60 * 60 * 24);

    if (days > 7) {
        const err = new Error("Recovery period expired. Please signup as a new user.");
        err.statusCode = 403;
        throw err;
    }

    // 1️⃣ Database Update (Restore)
    const { error: dbError } = await supabase.from('users').update({ 
        is_deleted: false, 
        deleted_at: null 
    }).eq('id', user.id);

    if (dbError) throw new Error("Failed to restore account in database.");

    // 2️⃣ Firebase Update (🚨 FIX 3: Transaction / Rollback Logic)
    try {
        await admin.auth().updateUser(user.firebase_uid, { disabled: false });
    } catch (firebaseError) {
        console.error("❌ Firebase Recovery Error, Rolling back DB:", firebaseError.message);
        
        // 🔄 ROLLBACK: अगर Firebase अकाउंट इनेबल नहीं कर पाया, तो DB को वापस Deleted मार्क कर दो
        await supabase.from('users').update({ 
            is_deleted: true, 
            deleted_at: user.deleted_at // पुराना टाइमस्टैम्प वापस डाल दें
        }).eq('id', user.id);

        const err = new Error("Failed to securely enable account. Try again.");
        err.statusCode = 500;
        throw err;
    }

    return {
        success: true,
        message: "Account recovered successfully ✅"
    };
};
