// services/authService.js
const crypto = require("crypto");
const admin = require("../config/firebase");
const supabase = require("../config/supabase");
const {
  handleFirebaseUser,
  checkReferralAndDevice,
  rewardReferrer
} = require("./signupHelpers");

const PLAN_CONFIG = {
  free: { credits: 10, limit: 10 },
  pro: { credits: 100, limit: 100 },
  premium: { credits: 500, limit: 500 }
};

const normalizeEmail = (email) =>
  email?.trim().toLowerCase() || null;

const normalizeName = (name) =>
  name?.trim() || "User";

const generateReferralCode = () =>
  crypto.randomBytes(4).toString("hex").toUpperCase();

// ==========================================
// 🚨 FIX 1: Sequential Fallback Lookup
// ==========================================
const findUser = async ({ firebaseUid, email, mobile }) => {
  const selectFields = `
    id,
    firebase_uid,
    email,
    mobile,
    name,
    profile_image,
    auth_provider,
    is_deleted,
    referral_code
  `;

  let user = null;

  // 1. सबसे पहले UID से चेक करें (Highest Confidence)
  if (firebaseUid) {
    const { data, error } = await supabase
      .from("users")
      .select(selectFields)
      .eq("firebase_uid", firebaseUid)
      .maybeSingle();
    
    if (error) throw new Error(error.message);
    user = data;
  }

  // 2. अगर UID से नहीं मिला, तो Email से चेक करें (Account Linking)
  if (!user && email) {
    const { data, error } = await supabase
      .from("users")
      .select(selectFields)
      .eq("email", email)
      .maybeSingle();
      
    if (error) throw new Error(error.message);
    user = data;
  }

  // 3. अगर Email से भी नहीं मिला, तो Mobile से चेक करें
  if (!user && mobile) {
    const { data, error } = await supabase
      .from("users")
      .select(selectFields)
      .eq("mobile", mobile)
      .maybeSingle();
      
    if (error) throw new Error(error.message);
    user = data;
  }

  return user;
};

exports.authService = async (payload) => {
  let {
    email,
    mobile,
    name,
    authProvider,
    deviceId,
    deviceFingerprint, // 🔥 FIX 2: Extracted deviceFingerprint
    referral,
    membership
  } = payload;

  email = normalizeEmail(email);
  name = normalizeName(name);

  const { firebaseUser, profileImage } =
    await handleFirebaseUser(payload);

  const firebaseUid = firebaseUser?.uid || null;

  let user = await findUser({
    firebaseUid,
    email,
    mobile
  });

  if (user?.is_deleted) {
    const err = new Error("Account deleted");
    err.statusCode = 403;
    throw err;
  }

  // अगर checkReferralAndDevice helper को भी fingerprint चाहिए, 
  // तो आप उसे यहाँ पास कर सकते हैं: checkReferralAndDevice({ deviceId, deviceFingerprint }, ...)
  // अभी के लिए मैंने इसे existing signature के हिसाब से रखा है।
  const {
    deviceRecord,
    refUser,
    appliedReferral
  } = await checkReferralAndDevice(
    deviceId,
    !user ? referral : null
  );

  const plan =
    PLAN_CONFIG[membership] ? membership : "free";

  let finalUser;
  let isNewUser = false;

  if (user) {
    const updateData = {
      firebase_uid: user.firebase_uid || firebaseUid,
      email: user.email || email,
      mobile: user.mobile || mobile,
      name: user.name || name, 
      auth_provider: user.auth_provider || authProvider,
      
      // 🔥 Fingerprint और Device ID को update भी कर सकते हैं अगर यूज़र नई डिवाइस से आया है
      device_id: deviceId || user.device_id,
      device_fingerprint: deviceFingerprint || user.device_fingerprint
    };

    if (profileImage && !user.profile_image) {
      updateData.profile_image = profileImage;
    }

    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", user.id)
      .select("id, referral_code, firebase_uid")
      .single();

    if (error) throw new Error(error.message);

    finalUser = data;
  } else {
    const insertData = {
      firebase_uid: firebaseUid,
      email,
      mobile,
      name,
      auth_provider: authProvider,
      profile_image: profileImage || null,
      
      device_id: deviceId || null,
      device_fingerprint: deviceFingerprint || null, // 🔥 Stored in database for new user

      referral_code: generateReferralCode(),
      referred_by: appliedReferral ? refUser?.id : null,

      membership: plan,
      ai_plan: plan,
      ai_credits: PLAN_CONFIG[plan].credits,
      ai_total_limit: PLAN_CONFIG[plan].limit
    };

    const { data, error } = await supabase
      .from("users")
      .insert(insertData)
      .select("id, referral_code, firebase_uid")
      .single();

    if (error) throw new Error(error.message);

    finalUser = data;
    isNewUser = true;

    await supabase
      .from("onboarding_status")
      .insert({
        user_id: finalUser.id
      });
  }

  if (
    isNewUser &&
    deviceId &&
    deviceRecord &&
    appliedReferral
  ) {
    await supabase
      .from("devices")
      .update({
        referral_used: true
      })
      .eq("device_id", deviceId);

    await rewardReferrer(refUser, PLAN_CONFIG);
  }

  let customToken = null;

  if (
    authProvider === "truecaller" &&
    finalUser.firebase_uid
  ) {
    customToken = await admin
      .auth()
      .createCustomToken(finalUser.firebase_uid);
  }

  return {
    success: true,
    isNewUser,
    customToken,
    user: {
      id: finalUser.id,
      referralCode: finalUser.referral_code
    }
  };
};
