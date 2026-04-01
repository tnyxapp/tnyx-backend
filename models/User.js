const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    firebaseUid: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },

    // 🔥 REQUIRED PROFILE DATA
    name: { type: String, default: "" },
    goals: [String],
    gender: { type: String, default: "" },
    dob: { type: String, default: "" },
    height: { type: Number },
    weight: { type: Number },
    activityLevel: { type: String, default: "" },
    mobile: { type: String, default: "" },

    // 🔥 EXTRA DATA (optional)
    extra: {
        healthCondition: { type: String, default: "" },
        workoutTime: { type: String, default: "" },
        allergies: { type: String, default: "" },
        dietPreference: { type: String, default: "" }
    },

    // ✅ NEW FIELDS (यहीं add करना है)
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
