const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

    firebaseUid: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },

    // 🔥 PROFILE DATA
    name: {
        type: String,
        default: "",
        trim: true
    },

    goals: {
        type: [String],
        default: []
    },

    gender: {
        type: String,
        enum: ["male", "female", "other", ""],
        default: ""
    },

    dob: {
        type: String,
        default: ""
    },

    height: {
        type: Number,
        min: 0,
        default: 0
    },

    weight: {
        type: Number,
        min: 0,
        default: 0
    },

    activityLevel: {
        type: String,
        enum: ["low", "medium", "active", ""],
        default: ""
    },

    mobile: {
        type: String,
        default: "",
        trim: true
    },

    // 🔥 EXTRA DATA
    extra: {
        healthCondition: { type: String, default: "" },
        workoutTime: { type: String, default: "" },
        allergies: { type: String, default: "" },
        dietPreference: { type: String, default: "" }
    },

    // 🔥 SOFT DELETE
    isDeleted: {
        type: Boolean,
        default: false,
        index: true
    },

    deletedAt: {
        type: Date,
        default: null
    }

}, { timestamps: true });


// ❌ REMOVE THESE (duplicate)
// userSchema.index({ email: 1 });
// userSchema.index({ firebaseUid: 1 });


// 🔥 Clean JSON response
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.__v;
    return obj;
};

module.exports = mongoose.model("User", userSchema);