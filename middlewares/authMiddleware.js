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
    req.user = {
      uid: decoded.uid,
      email: decoded.email
    };

    return next();

  } catch (error) {

    console.error("❌ Auth Middleware Error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
};