// services/workoutService.js
const supabase = require("../config/supabase");

const VALID_GYM_ACCESS = [
  "home",
  "gym",
  "both"
];

const VALID_EXPERIENCE = [
  "beginner",
  "intermediate",
  "advanced"
];

const VALID_WEEK_DAYS = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun"
];

const VALID_SPLITS = [
  "full_body",
  "upper_lower",
  "push_pull_legs",
  "bro_split",
  "custom"
];

const normalizeText = (value) => {
  if (typeof value !== "string") return null;

  const clean = value.trim();

  return clean || null;
};

const normalizeArray = (arr) => {
  if (!Array.isArray(arr)) return [];

  return [
    ...new Set(
      arr
        .map((v) =>
          typeof v === "string"
            ? v.trim()
            : null
        )
        .filter(Boolean)
    )
  ];
};

const normalizeGymAccess = (value) => {
  const clean = normalizeText(value);

  return VALID_GYM_ACCESS.includes(clean)
    ? clean
    : null;
};

const normalizeExperience = (value) => {
  const clean = normalizeText(value);

  return VALID_EXPERIENCE.includes(clean)
    ? clean
    : null;
};

const normalizeWeekDays = (days) => {
  if (!Array.isArray(days)) return null;

  const clean = [
    ...new Set(
      days
        .map((d) =>
          typeof d === "string"
            ? d.trim().toLowerCase()
            : null
        )
        .filter(
          (d) =>
            d &&
            VALID_WEEK_DAYS.includes(d)
        )
    )
  ];

  return clean.length ? clean : null;
};

const normalizeSplit = (value) => {
  const clean = normalizeText(value);

  return VALID_SPLITS.includes(clean)
    ? clean
    : null;
};

const normalizeWorkoutTime = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const num = Number(value);

  if (isNaN(num)) return null;
  if (num < 10 || num > 300) return null;

  return num;
};

exports.getWorkoutProfile = async (
  userId
) => {
  const { data, error } = await supabase
    .from("users")
    .select(`
      gym_access,
      equipment,
      experience_level,
      focus_area,
      week_days,
      workout_time,
      split_program,
      health_concerns,
      special_event
    `)
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data) {
    const err = new Error(
      "User not found"
    );
    err.statusCode = 404;
    throw err;
  }

  return {
    success: true,
    workout: {
      gymAccess: data.gym_access,
      equipment: data.equipment || [],
      experienceLevel:
        data.experience_level,
      focusArea: data.focus_area || [],
      weekDays: data.week_days || [],
      workoutTime: data.workout_time,
      splitProgram:
        data.split_program,
      healthConcerns:
        data.health_concerns || [],
      specialEvent:
        data.special_event
    }
  };
};

exports.updateWorkoutProfile = async (
  userId,
  payload
) => {
  const updateData = {};

  if ("gymAccess" in payload) {
    const gymAccess =
      normalizeGymAccess(
        payload.gymAccess
      );

    if (!gymAccess) {
      const err = new Error(
        "Invalid gym access"
      );
      err.statusCode = 400;
      throw err;
    }

    updateData.gym_access = gymAccess;
  }

  if ("equipment" in payload) {
    updateData.equipment =
      normalizeArray(
        payload.equipment
      );
  }

  if ("experienceLevel" in payload) {
    const level =
      normalizeExperience(
        payload.experienceLevel
      );

    if (!level) {
      const err = new Error(
        "Invalid experience level"
      );
      err.statusCode = 400;
      throw err;
    }

    updateData.experience_level =
      level;
  }

  if ("focusArea" in payload) {
    updateData.focus_area =
      normalizeArray(
        payload.focusArea
      );
  }

  if ("weekDays" in payload) {
    const weekDays =
      normalizeWeekDays(
        payload.weekDays
      );

    if (!weekDays) {
      const err = new Error(
        "Invalid week days"
      );
      err.statusCode = 400;
      throw err;
    }

    updateData.week_days = weekDays;
  }

  if ("workoutTime" in payload) {
    const workoutTime =
      normalizeWorkoutTime(
        payload.workoutTime
      );

    if (!workoutTime) {
      const err = new Error(
        "Invalid workout time"
      );
      err.statusCode = 400;
      throw err;
    }

    updateData.workout_time =
      workoutTime;
  }

  if ("splitProgram" in payload) {
    const split =
      normalizeSplit(
        payload.splitProgram
      );

    if (!split) {
      const err = new Error(
        "Invalid split program"
      );
      err.statusCode = 400;
      throw err;
    }

    updateData.split_program =
      split;
  }

  if ("healthConcerns" in payload) {
    updateData.health_concerns =
      normalizeArray(
        payload.healthConcerns
      );
  }

  if ("specialEvent" in payload) {
    updateData.special_event =
      normalizeText(
        payload.specialEvent
      );
  }

  if (!Object.keys(updateData).length) {
    const err = new Error(
      "No valid workout fields provided"
    );
    err.statusCode = 400;
    throw err;
  }

  const { data, error } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", userId)
    .select(`
      gym_access,
      equipment,
      experience_level,
      focus_area,
      week_days,
      workout_time,
      split_program,
      health_concerns,
      special_event
    `)
    .single();

  if (error) throw new Error(error.message);

  return {
    success: true,
    message:
      "Workout profile updated successfully",
    workout: {
      gymAccess: data.gym_access,
      equipment: data.equipment || [],
      experienceLevel:
        data.experience_level,
      focusArea: data.focus_area || [],
      weekDays: data.week_days || [],
      workoutTime: data.workout_time,
      splitProgram:
        data.split_program,
      healthConcerns:
        data.health_concerns || [],
      specialEvent:
        data.special_event
    }
  };
};