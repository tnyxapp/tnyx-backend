// services/profileService.js

const supabase = require("../config/supabase");

const normalizeText = (value) => {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  return clean || null;
};

const normalizeEmail = (email) => {
  const clean = normalizeText(email);
  return clean ? clean.toLowerCase() : null;
};

const normalizeGender = (gender) => {
  const allowed = ["male", "female", "other"];
  const clean = normalizeText(gender)?.toLowerCase();
  return allowed.includes(clean) ? clean : null;
};

const normalizeDob = (dob) => {
  if (!dob) return null;

  const date = new Date(Number(dob) || dob);

  if (isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
};

exports.getProfile = async (userId) => {
  const { data, error } = await supabase
    .from("users")
    .select(`
      id,
      name,
      email,
      mobile,
      dob,
      gender,
      profile_image
    `)
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  return {
    success: true,
    profile: {
      id: data.id,
      name: data.name,
      email: data.email,
      mobile: data.mobile,
      dob: data.dob,
      gender: data.gender,
      profileImage: data.profile_image
    }
  };
};

exports.updateProfile = async (userId, payload) => {
  const updateData = {};

  if ("name" in payload) {
    const name = normalizeText(payload.name);
    if (name) updateData.name = name;
  }

  if ("email" in payload) {
    const email = normalizeEmail(payload.email);
    if (!email) {
      const err = new Error("Invalid email");
      err.statusCode = 400;
      throw err;
    }
    updateData.email = email;
  }

  if ("mobile" in payload) {
    const mobile = normalizeText(payload.mobile);
    updateData.mobile = mobile;
  }

  if ("gender" in payload) {
    const gender = normalizeGender(payload.gender);
    if (!gender) {
      const err = new Error("Invalid gender");
      err.statusCode = 400;
      throw err;
    }
    updateData.gender = gender;
  }

  if ("dob" in payload) {
    const dob = normalizeDob(payload.dob);
    if (!dob) {
      const err = new Error("Invalid date of birth");
      err.statusCode = 400;
      throw err;
    }
    updateData.dob = dob;
  }

  if (!Object.keys(updateData).length) {
    const err = new Error("No valid fields to update");
    err.statusCode = 400;
    throw err;
  }

  const { data, error } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", userId)
    .select(`
      id,
      name,
      email,
      mobile,
      dob,
      gender,
      profile_image
    `)
    .single();

  if (error) {
    if (error.code === "23505") {
      const err = new Error("Email or mobile already linked");
      err.statusCode = 409;
      throw err;
    }

    throw new Error(error.message);
  }

  return {
    success: true,
    message: "Profile updated successfully",
    profile: {
      id: data.id,
      name: data.name,
      email: data.email,
      mobile: data.mobile,
      dob: data.dob,
      gender: data.gender,
      profileImage: data.profile_image
    }
  };
};