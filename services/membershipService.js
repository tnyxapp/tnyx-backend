// services/membershipService.js
const supabase =
  require("../config/supabase");

const PLAN_CONFIG = {
  free: {
    credits: 10,
    limit: 10,
    days: 0
  },
  pro: {
    credits: 100,
    limit: 100,
    days: 30
  },
  premium: {
    credits: 500,
    limit: 500,
    days: 30
  }
};

const VALID_PLANS = Object.keys(
  PLAN_CONFIG
);

const addDays = (
  date,
  days
) => {
  const d = new Date(date);
  d.setDate(
    d.getDate() + days
  );
  return d.toISOString();
};

exports.getMembership =
  async (userId) => {
    const { data, error } =
      await supabase
        .from("users")
        .select(`
          membership,
          ai_plan,
          ai_credits,
          ai_total_limit,
          trial_start,
          trial_end
        `)
        .eq("id", userId)
        .maybeSingle();

    if (error)
      throw new Error(
        error.message
      );

    if (!data) {
      const err = new Error(
        "User not found"
      );
      err.statusCode = 404;
      throw err;
    }

    return {
      success: true,
      membership: {
        plan:
          data.ai_plan ||
          "free",
        credits:
          data.ai_credits || 0,
        limit:
          data.ai_total_limit ||
          0,
        startsAt:
          data.trial_start,
        expiresAt:
          data.trial_end
      }
    };
  };

exports.purchaseMembership =
  async (
    userId,
    payload
  ) => {
    const plan =
      payload.plan;

    if (
      !VALID_PLANS.includes(
        plan
      ) ||
      plan === "free"
    ) {
      const err =
        new Error(
          "Invalid membership plan"
        );
      err.statusCode = 400;
      throw err;
    }

    const config =
      PLAN_CONFIG[plan];

    const now =
      new Date();
    const expiresAt =
      addDays(
        now,
        config.days
      );

    const updateData = {
      membership: plan,
      ai_plan: plan,
      ai_credits:
        config.credits,
      ai_total_limit:
        config.limit,
      trial_start:
        now.toISOString(),
      trial_end:
        expiresAt
    };

    const { data, error } =
      await supabase
        .from("users")
        .update(updateData)
        .eq("id", userId)
        .select(`
          membership,
          ai_plan,
          ai_credits,
          ai_total_limit,
          trial_start,
          trial_end
        `)
        .single();

    if (error)
      throw new Error(
        error.message
      );

    return {
      success: true,
      message:
        "Membership activated successfully",
      membership: {
        plan:
          data.ai_plan,
        credits:
          data.ai_credits,
        limit:
          data.ai_total_limit,
        startsAt:
          data.trial_start,
        expiresAt:
          data.trial_end
      }
    };
  };

exports.consumeCredits =
  async (
    userId,
    credits = 1
  ) => {
    const { data, error } =
      await supabase
        .from("users")
        .select(`
          ai_credits
        `)
        .eq("id", userId)
        .maybeSingle();

    if (error)
      throw new Error(
        error.message
      );

    if (!data) {
      const err = new Error(
        "User not found"
      );
      err.statusCode = 404;
      throw err;
    }

    const current =
      Number(
        data.ai_credits
      ) || 0;

    if (
      current < credits
    ) {
      const err =
        new Error(
          "Insufficient credits"
        );
      err.statusCode = 402;
      throw err;
    }

    const left =
      current - credits;

    await supabase
      .from("users")
      .update({
        ai_credits: left
      })
      .eq("id", userId);

    return {
      success: true,
      creditsLeft: left
    };
  };

exports.grantCredits =
  async (
    userId,
    credits
  ) => {
    const amount =
      Number(credits);

    if (
      isNaN(amount) ||
      amount <= 0
    ) {
      const err =
        new Error(
          "Invalid credit amount"
        );
      err.statusCode = 400;
      throw err;
    }

    const { data, error } =
      await supabase
        .from("users")
        .select(`
          ai_credits
        `)
        .eq("id", userId)
        .maybeSingle();

    if (error)
      throw new Error(
        error.message
      );

    if (!data) {
      const err = new Error(
        "User not found"
      );
      err.statusCode = 404;
      throw err;
    }

    const updated =
      (Number(
        data.ai_credits
      ) || 0) + amount;

    await supabase
      .from("users")
      .update({
        ai_credits:
          updated
      })
      .eq("id", userId);

    return {
      success: true,
      credits:
        updated
    };
  };