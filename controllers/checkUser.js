const admin = require("../config/firebase");
const User = require("../models/User");

exports.checkUser = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;

    const user = await User.findOne({ firebaseUid: uid });

if (!user) {
  return res.status(404).json({ message: "User not found" });
}

// ✅ ADD THIS HERE
if (user.isDeleted) {
  return res.status(400).json({
    message: "Account already deleted"
  });
}

// ✅ Soft delete
user.isDeleted = true;
user.deletedAt = new Date();
await user.save();

    if (!user) {
      return res.status(404).json({
        isProfileComplete: false,
        isExtraComplete: false
      });
    }

    const isProfileComplete =
      user.name &&
      user.gender &&
      user.height > 0 &&
      user.weight > 0 &&
      user.activityLevel &&
      user.mobile;

    const isExtraComplete =
      user.extra?.healthCondition ||
      user.extra?.workoutTime ||
      user.extra?.allergies ||
      user.extra?.dietPreference;

    res.status(200).json({
      isProfileComplete: !!isProfileComplete,
      isExtraComplete: !!isExtraComplete
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
