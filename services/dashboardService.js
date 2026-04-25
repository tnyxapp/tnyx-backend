// services/dashboardService.js

const supabase =
  require("../config/supabase");

const todayKey = () => {
  return new Date()
    .toISOString()
    .slice(0, 10);
};

const calculateProgress = (
  current,
  target
) => {
  const c =
    Number(current) || 0;

  const t =
    Number(target) || 0;

  if (!t) {
    return {
      current: c,
      target: t,
      percent: 0
    };
  }

  return {
    current: c,
    target: t,
    percent: Math.min(
      100,
      Math.round(
        (c / t) * 100
      )
    )
  };
};

exports.dashboardService =
  async (userId) => {
    const today =
      todayKey();

    const { data: user, error } =
      await supabase
        .from("users")
        .select(`
          id,
          name,
          profile_image,

          ai_plan,
          ai_credits,

          step_target,
          water_target,
          calorie_target,
          protein_target,

          week_days,
          split_program
        `)
        .eq("id", userId)
        .maybeSingle();

    if (error)
      throw new Error(
        error.message
      );

    if (!user) {
      const err =
        new Error(
          "User not found"
        );
      err.statusCode = 404;
      throw err;
    }

    // daily progress table
    const {
      data: progress
    } = await supabase
      .from("daily_progress")
      .select(`
        steps,
        water,
        calories,
        protein
      `)
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle();

    const weekday =
      new Date()
        .toLocaleDateString(
          "en-US",
          {
            weekday:
              "short"
          }
        )
        .slice(0, 3)
        .toLowerCase();

    const isWorkoutDay =
      user.week_days?.includes(
        weekday
      ) || false;

    return {
      success: true,

      profile: {
        id: user.id,
        name:
          user.name ||
          "User",
        profileImage:
          user.profile_image
      },

      membership: {
        plan:
          user.ai_plan ||
          "free",
        credits:
          user.ai_credits ||
          0
      },

      targets: {
        steps:
          user.step_target ||
          0,

        water:
          user.water_target ||
          0,

        calories:
          user.calorie_target ||
          0,

        protein:
          user.protein_target ||
          0
      },

      progress: {
        steps:
          calculateProgress(
            progress?.steps,
            user.step_target
          ),

        water:
          calculateProgress(
            progress?.water,
            user.water_target
          ),

        calories:
          calculateProgress(
            progress?.calories,
            user.calorie_target
          ),

        protein:
          calculateProgress(
            progress?.protein,
            user.protein_target
          )
      },

      workout: {
        isWorkoutDay,
        splitProgram:
          user.split_program,
        scheduledDays:
          user.week_days || []
      }
    };
  };