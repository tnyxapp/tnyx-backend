// 🚀 FIRST LINE
require('dns').setDefaultResultOrder('ipv4first');

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");

const app = express();


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


// ================= ROUTES =================
app.use("/api/auth", authRoutes);


// 🔥 health check
app.get("/", (req, res) => {
  res.send("Backend working 🚀");
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

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("❌ Startup error:", error.message);
    process.exit(1);
  }
};


// 🔥 runtime crash logging
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err && err.message ? err.message : err);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err && err.message ? err.message : err);
});


startServer();