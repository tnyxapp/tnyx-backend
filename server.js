// 🚀 FIRST LINE
require('dns').setDefaultResultOrder('ipv4first');
require("./jobs/cronJobs"); // 🔥 Start Cron Jobs

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const aiRoutes = require("./routes/aiRoutes");

const app = express();

app.set("trust proxy", 1);

// 🔥 security middleware
app.use(helmet());

// 🔥 logging (dev only)
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// 🔥 CORS (restrict in production)
app.use(cors({
  origin: "*", // 👉 production में specific domain डालना
}));

// 🔥 body parser
app.use(express.json());

// ✅ static files (privacy policy)
app.use(express.static("public"));

// 🔥 DB guard middleware 
app.use("/api", (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: "Database not connected"
    });
  }
  next();
});


// ================= ROUTES =================
app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);

// 🔥 health check
app.get("/", (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";

  res.json({
    success: true,
    message: "Backend working",
    database: dbStatus
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

mongoose.connection.on("error", (error) => {
  console.error("❌ MongoDB runtime error:", error.message);
});

mongoose.connection.on("disconnected", () => {
  console.error("❌ MongoDB disconnected");
});

// 🔥 DB + SERVER START
const startServer = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI not defined");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    // 👇
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("❌ Startup error:", error.message);
    process.exit(1);
  }
};


// 🔥 runtime crash logging
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err.message);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message);
  process.exit(1);
});


startServer();
