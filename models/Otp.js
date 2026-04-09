const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    index: true,
    lowercase: true,
    trim: true
  },
  
  // 🔥 NEW: Multi-purpose OTP Type
  type: {
        type: String,
        enum: ["SIGNUP", "RESET_PASSWORD", "LINK_EMAIL"],
        required: true
    },

  // 🔐 hashed OTP (security)
  otp: {
    type: String,
    required: true,
  },

  attempts: {
    type: Number,
    default: 0,
  },

  // 🔥 expiry
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }
  },

  // 🔥 optional security (pro level)
  ip: {
    type: String,
    default: ""
  },

  userAgent: {
    type: String,
    default: ""
  }

}, { timestamps: true });

module.exports = mongoose.model("Otp", otpSchema);