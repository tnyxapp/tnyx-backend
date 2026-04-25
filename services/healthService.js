// services/healthService.js

const supabase = require("../config/supabase");

const VALID_GOALS = [
  "lose_weight",
  "gain_muscle",
  "maintenance"
];

const VALID_ACTIVITY = [
  "sedentary",
  "light",
  "active",
  "very_active"
];

const normalizeNumber = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const num = Number(value);

  if (isNaN(num)) return null;

  return num;
};

const validateHeight = (value) => {
  const num = normalizeNumber(value);

  if (num === null) return null;
  if (num < 50 || num > 300) return null;

  return num;
};

const validateWeight = (value) => {
  const num = normalizeNumber(value);

  if (num === null) return null;
  if (num < 20 || num > 500) return null;

  return num;
};

const normalizeGoals = (goals) => {
  if (!Array.isArray(goals)) return null;

  const clean = goals.filter((goal) =>
    VALID_GOALS.includes(goal)
  );

  return clean.length ? clean : null;
};

const normalizeActivity = (level) => {
  if (!level) return null;

  return VALID_ACTIVITY.includes(level)
    ? level
    : null;
};

const normalizeArray = (arr) => {
  if (!Array.isArray(arr)) return null;

  const clean = arr
    .map((v) =>
      typeof v === "string"
        ? v.trim()
        : null
    )
    .filter(Boolean);

  return clean.length ? clean : [];
};

exports.getHealthProfile = async (userId) => {
  const { data, error } = await supabase
    .from("users")
    .select(`
      height,
      current_weight,
      target_weight,
      goals,
      activity_level,
      health_conditions,
      other_health_condition
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
    health: {
      height: data.height,
      currentWeight: data.current_weight,
      targetWeight: data.target_weight,
      goals: data.goals || [],
      activityLevel: data.activity_level,
      healthConditions:
        data.health_conditions || [],
      otherHealthCondition:
        data.other_health_condition
    }
  };
};

exports.updateHealthProfile = async (
  userId,
  payload
) => {
  const updateData = {};

  if ("height" in payload) {
    const height = validateHeight(
      payload.height
    );

    if (height === null) {
      const err = new Error(
        "Invalid height"
      );
      err.statusCode = 400;
      throw err;
    }

    updateData.height = height;
  }

  if (
    "currentWeight" in payload ||
    "current_weight" in payload
  ) {
    const weight = validateWeight(
      payload.currentWeight ??
      payload.current_weight
    );

    if (weight === null) {
      const err = new Error(
        "Invalid current weight"
      );
      err.statusCode = 400;
      throw err;
    }

    updateData.current_weight = weight;
  }

  if (
    "targetWeight" in payload ||
    "target_weight" in payload
  ) {
    const weight = validateWeight(
      payload.targetWeight ??
      payload.target_weight
    );

    if (weight === null) {
      const err = new Error(
        "Invalid target weight"
      );
      err.statusCode = 400;
      throw err;
    }

    updateData.target_weight = weight;
  }

  if ("goals" in payload) {
    const goals = normalizeGoals(
      payload.goals
    );

    if (!goals) {
      const err = new Error(
        "Invalid goals"
      );
      err.statusCode = 400;
      throw err;
    }

    updateData.goals = goals;
  }

  if (
    "activityLevel" in payload ||
    "activity_level" in payload
  ) {
    const activity = normalizeActivity(
      payload.activityLevel ??
      payload.activity_level
    );

    if (!activity) {
      const err = new Error(
        "Invalid activity level"
      );
      err.statusCode = 400;
      throw err;
    }

    updateData.activity_level = activity;
  }

  if ("healthConditions" in payload) {
    updateData.health_conditions =
      normalizeArray(
        payload.healthConditions
      );
  }

  if (
    "otherHealthCondition" in payload
  ) {
    updateData.other_health_condition =
      payload.otherHealthCondition?.trim() ||
      null;
  }

  if (!Object.keys(updateData).length) {
    const err = new Error(
      "No valid health fields provided"
    );
    err.statusCode = 400;
    throw err;
  }

  const { data, error } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", userId)
    .select(`
      height,
      current_weight,
      target_weight,
      goals,
      activity_level,
      health_conditions,
      other_health_condition
    `)
    .single();

  if (error) throw new Error(error.message);

  return {
    success: true,
    message:
      "Health profile updated successfully",
    health: {
      height: data.height,
      currentWeight:
        data.current_weight,
      targetWeight:
        data.target_weight,
      goals: data.goals || [],
      activityLevel:
        data.activity_level,
      healthConditions:
        data.health_conditions || [],
      otherHealthCondition:
        data.other_health_condition
    },

    shouldRecalculateTargets: true
  };
};