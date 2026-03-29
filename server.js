const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");

const app = express();
app.use(express.json());

// MongoDB connect
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected ✅"))
  .catch(err => console.error("Mongo Error:", err.message));

// routes use
app.use("/api/auth", authRoutes);

// test route
app.get("/", (req, res) => {
  res.send("Backend working 🚀");
});

// ✅ IMPORTANT FIX (Render compatible)
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
