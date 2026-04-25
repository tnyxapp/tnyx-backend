//services/authService.js
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

const findUser = async ({ firebaseUid, email, mobile }) => {
  let query = supabase
    .from("users")
    .select(`
      id,
      firebase_uid,
      email,
      mobile,
      is_deleted,
      referral_code
    `);

  if (firebaseUid) {
    query = query.eq("firebase_uid", firebaseUid);
  } else if (email) {
    query = query.eq("email", email);
  } else if (mobile) {
    query = query.eq("mobile", mobile);
  } else {
    return null;
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

exports.authService = async (payload) => {
  let {
    email,
    mobile,
    name,
    authProvider,
    deviceId,
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
      name,
      auth_provider: authProvider
    };

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
      profile_image: profileImage,
      device_id: deviceId || null,

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