const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    index: true,
  },
  otp: {
    type: String,
    required: true,
  },
  attempts: {
    type: Number,
    default: 0, // 🔥 attempt tracking
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // 🔥 auto delete after expiry
  }
}, { timestamps: true });

module.exports = mongoose.model("Otp", otpSchema);
