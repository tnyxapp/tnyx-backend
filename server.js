// 🚀 FIRST LINE - इसे वापस ले आएँ (यह MongoDB/Truecaller API calls को स्टेबल रखता है)
require('dns').setDefaultResultOrder('ipv4first');

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");

const app = express();

// 👉 Proxy के लिए ज़रूरी (चूंकि आप Rate Limit यूज़ कर रहे हैं)
app.set("trust proxy", 1);

// 🔥 Helmet को अभी के लिए हटा दिया है ताकि कनेक्शन ब्लॉक न हो
// app.use(helmet()); 

app.use(morgan("dev"));

app.use(cors({
  origin: "*"
}));

app.use(express.json());
app.use(express.static("public"));

// ================= ROUTES =================
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Backend working 🚀");
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error("❌ Global Error:", err.message);
  res.status(err.status || 500).json({ success: false, message: err.message || "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;

// 🔥 DB + SERVER START
const startServer = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI not defined");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    // 👇 यहाँ से "0.0.0.0" हटा दिया है, बिल्कुल पुराने कोड की तरह
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("❌ Startup error:", error.message);
    process.exit(1);
  }
};

startServer();
