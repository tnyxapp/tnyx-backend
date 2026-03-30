const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    firebaseUid: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    goals: [String],
    gender: { type: String },
    dob: { type: String },
    height: { type: String },
    weight: { type: String },
    activityLevel: { type: String },
    mobile: { type: String },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
