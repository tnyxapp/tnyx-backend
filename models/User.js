const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

    // 🔥 Firebase UID (optional now)
    firebaseUid: {
        type: String,
        default: null,
        unique: true,
        sparse: true, // ✅ important
        index: true
    },

    // 🔥 Email (optional for truecaller)
    email: {
        type: String,
        default: null,
        lowercase: true,
        trim: true,
        unique: true,
        sparse: true,
        index: true
    },

    mobile: {
        type: String,
        default: null,
        trim: true,
        unique: true,
        sparse: true,
        index: true
    },
    // 🔥 Auth Provider (NEW)
    authProvider: {
        type: String,
        enum: ["email", "google", "truecaller"],
        default: "email",
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
        type: Date,
        default: null
    },

    height: {
        type: Number,
        min: 0,
        default: 0
    },

    current_weight: {
        type: Number,
        min: 0,
        default: 0
    },

    target_weight: {
        type: Number,
        min: 0,
        default: 0
    },

    activityLevel: {
        type: String,
        enum: ["low", "medium", "active", ""],
        default: ""
    },

    // 🔥 WORKOUT
    gymAccess: { type: Boolean, default: false, index: true },
    equipment: { type: [String], default: [] },
    focusAreas: { type: [String], default: [] },
    trainingDays: {
        type: [Number],
        default: [],
        validate: {
            validator: arr => arr.every(d => d >= 0 && d <= 6),
            message: "Invalid training day"
        }
    },
    workoutDuration: { type: String, default: "" },
    workoutSplit: { type: String, default: "" },

    // 🔥 TARGET
    stepTarget: { type: Number, default: 0 },
    sleepTarget: { type: Number, default: 0 },
    waterTarget: { type: Number, default: 0 },

    // 🔥 SOURCE
    referral: { type: String, default: "" },
    aboutUs: { type: String, default: "" },
    membership: { 
        type: String, 
        enum: ["free", "pro", "premium"], // add this
        default: "free" 
    },

    // 🔥 AI FEATURE
    aiPlan: {
        type: String,
        enum: ["free", "pro", "premium"],
        default: "free",
        index: true
    },

    aiCredits: {
        type: Number,
        default: 0   // remaining credits
    },

    aiTotalLimit: {
        type: Number,
        default: 0   // plan based max limit
    },

    aiUsed: {
        type: Number,
        default: 0   // total used
    },

    aiLastUsedAt: {
        type: Date,
        default: null
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


// 🔥 Clean JSON response
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.__v;
    return obj;
};

module.exports = mongoose.model("User", userSchema);