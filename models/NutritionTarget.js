// models/NutritionTarget.js
const mongoose = require("mongoose");

const nutritionTargetSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    
    // 1. MACROS (Dynamic)
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fats: { type: Number, default: 0 },
    fiber: { type: Number, default: 0 },
    water_ml: { type: Number, default: 0 },

    // 2. VITAMINS
    vitamins: {
        A_mcg: { type: Number, default: 0 },
        B1_mg: { type: Number, default: 0 },
        B2_mg: { type: Number, default: 0 },
        B3_mg: { type: Number, default: 0 },
        B6_mg: { type: Number, default: 0 },
        B12_mcg: { type: Number, default: 0 },
        C_mg: { type: Number, default: 0 },
        D_IU: { type: Number, default: 0 },
        E_mg: { type: Number, default: 0 },
        K_mcg: { type: Number, default: 0 },
        Folate_mcg: { type: Number, default: 0 }
    },

    // 3. MINERALS
    minerals: {
        Calcium_mg: { type: Number, default: 0 },
        Iron_mg: { type: Number, default: 0 },
        Magnesium_mg: { type: Number, default: 0 },
        Phosphorus_mg: { type: Number, default: 0 },
        Potassium_mg: { type: Number, default: 0 },
        Sodium_mg: { type: Number, default: 0 },
        Zinc_mg: { type: Number, default: 0 },
        Selenium_mcg: { type: Number, default: 0 }
    },

    // 4. METABOLIC DATA (Tracking for UI)
    metabolic: {
        bmr: { type: Number, default: 0 },
        tdee: { type: Number, default: 0 },
        bodyFatPercentage: { type: Number, default: 0 },
        leanBodyMass: { type: Number, default: 0 }
    }
}, { timestamps: true });

module.exports = mongoose.model("NutritionTarget", nutritionTargetSchema);