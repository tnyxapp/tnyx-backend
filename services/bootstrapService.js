// services/bootstrapService.js

const supabase =
  require("../config/supabase");

const PLAN_CONFIG = {
  free: {
    credits: 10,
    limit: 10
  },
  pro: {
    credits: 100,
    limit: 100
  },
  premium: {
    credits: 500,
    limit: 500
  }
};

const isExpired = (date) => {
  if (!date) return false;

  const d = new Date(date);

  if (isNaN(d.getTime())) {
    return false;
  }

  return new Date() > d;
};

const calculateProfileComplete = (
  user
) => {
  const required = [
    user.name,
    user.gender,
    user.dob,
    user.height,
    user.current_weight,
    user.target_weight,
    user.activity_level
  ];

  return required.every(Boolean);
};

const missingSections = (user) => {
  const missing = [];

  if (
    !user.height ||
    !user.current_weight ||
    !user.target_weight
  ) {
    missing.push("health");
  }

  if (
    !user.gym_access ||
    !user.week_days?.length
  ) {
    missing.push("workout");
  }

  if (
    !user.step_target ||
    !user.calorie_target
  ) {
    missing.push("targets");
  }

  return missing;
};

exports.bootstrapService =
  async (userId) => {
    const { data: user, error } =
      await supabase
        .from("users")
        .select(`
          id,
          name,
          email,
          mobile,
          gender,
          dob,
          profile_image,

          height,
          current_weight,
          target_weight,
          goals,
          activity_level,
          health_conditions,
          other_health_condition,

          gym_access,
          equipment,
          experience_level,
          focus_area,
          week_days,
          workout_time,
          split_program,
          health_concerns,
          special_event,

          step_target,
          water_target,
          calorie_target,
          protein_target,
          fiber_target,
          fat_target,
          wake_time,
          sleep_time,
          goal_pace,

          membership,
          ai_plan,
          ai_credits,
          ai_total_limit,
          trial_end
        `)
        .eq("id", userId)
        .maybeSingle();

    if (error)
      throw new Error(
        error.message
      );

    if (!user) {
      const err = new Error(
        "User not found"
      );
      err.statusCode = 404;
      throw err;
    }

    // membership expiry
    let membership =
      user.ai_plan ||
      "free";

    let credits =
      user.ai_credits || 0;

    let limit =
      user.ai_total_limit || 0;

    if (
      user.trial_end &&
      isExpired(
        user.trial_end
      ) &&
      membership !== "free"
    ) {
      membership = "free";
      credits =
        PLAN_CONFIG.free.credits;
      limit =
        PLAN_CONFIG.free.limit;

      await supabase
        .from("users")
        .update({
          ai_plan: "free",
          ai_credits:
            credits,
          ai_total_limit:
            limit
        })
        .eq("id", user.id);
    }

    const profileComplete =
      calculateProfileComplete(
        user
      );

    return {
      success: true,

      isProfileComplete:
        profileComplete,

      missingSections:
        missingSections(user),

      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        gender: user.gender,
        dob: user.dob,
        profileImage:
          user.profile_image
      },

      health: {
        height: user.height,
        currentWeight:
          user.current_weight,
        targetWeight:
          user.target_weight,
        goals:
          user.goals || [],
        activityLevel:
          user.activity_level,
        healthConditions:
          user.health_conditions ||
          [],
        otherHealthCondition:
          user.other_health_condition
      },

      workout: {
        gymAccess:
          user.gym_access,
        equipment:
          user.equipment || [],
        experienceLevel:
          user.experience_level,
        focusArea:
          user.focus_area || [],
        weekDays:
          user.week_days || [],
        workoutTime:
          user.workout_time,
        splitProgram:
          user.split_program,
        healthConcerns:
          user.health_concerns ||
          [],
        specialEvent:
          user.special_event
      },

      targets: {
        stepTarget:
          user.step_target,
        waterTarget:
          user.water_target,
        calorieTarget:
          user.calorie_target,
        proteinTarget:
          user.protein_target,
        fiberTarget:
          user.fiber_target,
        fatTarget:
          user.fat_target,
        wakeTime:
          user.wake_time,
        sleepTime:
          user.sleep_time,
        goalPace:
          user.goal_pace
      },

      membership: {
        plan: membership,
        credits,
        limit,
        expiresAt:
          user.trial_end
      }
    };
  };