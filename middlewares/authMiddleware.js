// middlewares/authMiddleware.js
const admin = require("../config/firebase");
const supabase = require("../config/supabase"); // 🔥 Supabase Import

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

    // 🔐 verify token via Firebase
    const decoded = await admin.auth().verifyIdToken(token);

    // 🔐 fetch user from Supabase (Mongoose हटाया गया)
    const { data: dbUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('firebase_uid', decoded.uid)
        .maybeSingle();

    if (error || !dbUser) {
      return res.status(401).json({
        success: false,
        message: "User not found in database"
      });
    }

    // अगर अकाउंट डिलीट हो चुका है
    if (dbUser.is_deleted) {
      return res.status(403).json({
        success: false,
        message: "Account is deleted"
      });
    }

    // 🔐 attach user info to request (अब सब controllers को Supabase वाला डेटा मिलेगा)
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