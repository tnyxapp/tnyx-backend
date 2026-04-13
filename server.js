// server.js 
require('dns').setDefaultResultOrder('ipv4first');
require("./jobs/cronJobs"); // 🔥 Start Cron Jobs

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

// 🔥 Routes इम्पोर्ट
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes"); // ✅ NAYA ROUTE ADD KIYA
const aiRoutes = require("./routes/aiRoutes");
const logRoutes = require("./routes/logRoutes");

const app = express();

app.set("trust proxy", 1);

// 🔥 security middleware
app.use(helmet());

// 🔥 logging (dev only)
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// 🔥 CORS 
app.use(cors({
  origin: "*", 
}));

// 🔥 body parser
app.use(express.json());

// ✅ static files (privacy policy)
app.use(express.static("public"));

// ================= ROUTES =================
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes); // ✅ USER ROUTES REGISTERED
app.use("/api/ai", aiRoutes);
app.use("/api/logs", logRoutes);

// 🔥 Server Wake-up Route (Android ऐप इसी को पिंग करेगी)
app.get("/api/ping", (req, res) => {
  res.status(200).json({ success: true, message: "Server is awake!" });
});

// 🔥 health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Backend is LIVE with Supabase 🚀",
  });
});

// 🔥 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

// 🔥 GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  console.error("❌ Global Error:", err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

const PORT = process.env.PORT || 5000;

// 🔥 SERVER START
const startServer = () => {
  try {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log("✅ Supabase configured and ready");
    });
  } catch (error) {
    console.error("❌ Startup error:", error.message);
    process.exit(1);
  }
};

// 🔥 runtime crash logging
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err.message);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message);
  process.exit(1);
});

startServer();
