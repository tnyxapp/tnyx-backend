const User = require("../models/User");

// 🔥 ENV आधारित control
const IS_TESTING = process.env.NODE_ENV !== "production";

exports.checkUser = async (req, res) => {
  try {
    // 🔐 middleware से UID
    const uid = req.user.uid;

    // 🔎 user fetch
    const user = await User.findOne({ firebaseUid: uid });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.isDeleted) {
      return res.status(403).json({
        success: false,
        message: "Account already deleted"
      });
    }

    // 🔥 TESTING MODE
    if (IS_TESTING) {
      return res.status(200).json({
        success: true,
        isDataComplete: true,
        isWorkoutComplete: true,
        isTargetComplete: true,
        isSourceComplete: true
      });
    }

    // ✅ DATA
    const isDataComplete =
      user.name &&
      user.gender &&
      user.dob &&
      user.height > 0 &&
      user.weight > 0 &&
      user.activityLevel &&
      user.mobile;

    // ✅ WORKOUT
    const isWorkoutComplete =
      user.gymAccess &&
      user.equipment?.length > 0 &&
      user.focusAreas?.length > 0 &&
      user.trainingDays?.length > 0 &&
      user.workoutDuration &&
      user.workoutSplit;

    // ✅ TARGET
    const isTargetComplete =
      user.stepTarget > 0 &&
      user.sleepTarget > 0 &&
      user.waterTarget > 0;

    // ✅ SOURCE
    const isSourceComplete =
      !!user.referral ||
      !!user.aboutUs ||
      !!user.membership;

    return res.status(200).json({
      success: true,
      isDataComplete: !!isDataComplete,
      isWorkoutComplete: !!isWorkoutComplete,
      isTargetComplete: !!isTargetComplete,
      isSourceComplete: !!isSourceComplete
    });

  } catch (error) {
    console.error("❌ checkUser error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};