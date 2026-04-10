const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    //  DEVICE TRACKING (Anti-Abuse)
    deviceId: {
        type: String,
        default: null,
        index: true
    },

    //  REFERRAL SYSTEM
    referralCode: {
        type: String,
        unique: true,
        sparse: true, // ✅ important
        index: true
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    referralCount: {
        type: Number,
        default: 0
    },

    //  TRIAL SYSTEM
    trialStart: { type: Date, default: null },
    trialEnd: { type: Date, default: null },
    isTrialUsed: { type: Boolean, default: false },

    //  Firebase UID (optional now)
    firebaseUid: {
        type: String,
        default: null,
        unique: true,
        sparse: true,
        index: true
    },

    //  Email & Mobile
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
    
    authProvider: {
        type: String,
        enum: ["email", "google", "truecaller"],
        default: "email",
    },

    //  PROFILE DATA
    name: { type: String, default: "", trim: true },
    goals: { type: [String], default: [] },
    gender: { type: String, default: "" },
    dob: { type: Date, default: null },
    height: { type: Number, min: 0, default: 0 },
    current_weight: { type: Number, min: 0, default: 0 },
    target_weight: { type: Number, min: 0, default: 0 },
    activityLevel: { type: String, default: "" },

    //  WORKOUT
    gymAccess: { type: Boolean, default: false, index: true },
    equipment: { type: [String], default: [] },
    focusAreas: { type: [String], default: [] },
    trainingDays: { type: [Number], default: [], },
    workoutDuration: { type: String, default: "" },
    workoutSplit: { type: String, default: "" },

    //  TARGET
    stepTarget: { type: Number, default: 0 },
    sleepTarget: { type: Number, default: 0 },
    waterTarget: { type: Number, default: 0 },

    //  SOURCE
    referral: { type: String, default: "" }, // user ने जो कोड डाला
    aboutUs: { type: String, default: "" },
    membership: { 
        type: String, 
        enum: ["free", "pro", "premium"],
        default: "free" 
    },

    //  AI FEATURE
    aiPlan: {
        type: String,
        enum: ["free", "pro", "premium"],
        default: "free",
        index: true
    },
    aiCredits: { type: Number, default: 0 },
    aiTotalLimit: { type: Number, default: 0 },
    aiUsed: { type: Number, default: 0 },
    aiLastUsedAt: { type: Date, default: null },

    //  SOFT DELETE
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null }

}, { timestamps: true });

userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.__v;
    return obj;
};

module.exports = mongoose.model("User", userSchema);