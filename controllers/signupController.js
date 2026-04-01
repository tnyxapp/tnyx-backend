const admin = require("../config/firebase");
const User = require("../models/User");

exports.signup = async (req, res) => {

    try {

        const { email, password, name, goals, gender, dob, height, weight, activityLevel, mobile } = req.body;



        let firebaseUser;

        let isNewUser = false;



        // 🔥 STEP 1: Firebase में check करो user है या नहीं

        try {

            firebaseUser = await admin.auth().getUserByEmail(email);

        } catch (err) {

            // ❌ user नहीं मिला → नया बनाओ

            firebaseUser = await admin.auth().createUser({

                email,

                password,

                displayName: name,

            });

            isNewUser = true;

        }



        // 🔥 STEP 2: MongoDB में check

        let user = await User.findOne({ email });

if (user && user.isDeleted) {
    return res.status(403).json({
        success: false,
        message: "Account deleted. Please recover your account"
    });
}

        if (user) {

            // 👉 EXISTING USER → UPDATE

            user.name = name;

            user.goals = goals;

            user.gender = gender;

            user.dob = dob;

            user.height = Number(height);

            user.weight = Number(weight);

            user.activityLevel = activityLevel;

            user.mobile = mobile;



            await user.save();

        } else {

            // 👉 NEW USER → CREATE

            user = new User({

                firebaseUid: firebaseUser.uid,

                email,

                name,

                goals,

                gender,

                dob,

                height,

                weight,

                activityLevel,

                mobile

            });



            await user.save();

            isNewUser = true;

        }



        // 🔥 FINAL RESPONSE

        res.status(200).json({

            success: true,

            message: isNewUser ? "New user created ✅" : "User updated ✅",

            isNewUser

        });



    } catch (error) {

        res.status(400).json({

            success: false,

            message: error.message

        });

    }

};
exports.googleSync = async (req, res) => {
  res.json({ message: "Google sync working" });
};

exports.deleteAccount = async (req, res) => {
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

    // ✅ Soft delete
    user.isDeleted = true;
    user.deletedAt = new Date();
    await user.save();

    // ✅ Firebase disable
    await admin.auth().updateUser(uid, { disabled: true });

    res.json({
      success: true,
      message: "Account deleted (recoverable for 7 days)"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//Recovery API Code
exports.recoverAccount = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });

    // ❌ user नहीं मिला या delete नहीं है
    if (!user || !user.isDeleted) {
      return res.status(400).json({
        message: "No deleted account found"
      });
    }

    // ⏱ 7 days limit check
    const diff = Date.now() - new Date(user.deletedAt).getTime();
    const days = diff / (1000 * 60 * 60 * 24);

    if (days > 7) {
      return res.status(400).json({
        message: "Recovery period expired"
      });
    }

    // ✅ restore user
    user.isDeleted = false;
    user.deletedAt = null;
    await user.save();

    // 🔥 Firebase enable
    const firebaseUser = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(firebaseUser.uid, { disabled: false });

    res.json({
      success: true,
      message: "Account recovered successfully ✅"
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
