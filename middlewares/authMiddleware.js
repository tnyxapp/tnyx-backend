const admin = require("../config/firebase");

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // 🔐 header validation
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    // 🔐 token extract
    const token = authHeader.split(" ")[1];

    // 🔐 verify token
    const decoded = await admin.auth().verifyIdToken(token);

    // 🔐 attach minimal user info
    const User = require("../models/User");

    const dbUser = await User.findOne({ firebaseUid: decoded.uid });

    if (!dbUser) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    req.user = dbUser;

    return next();

  } catch (error) {

    console.error("❌ Auth Middleware Error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
};