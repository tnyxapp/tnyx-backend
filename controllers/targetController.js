// controllers/targetController.js
const User = require("../models/User");
const NutritionTarget = require("../models/NutritionTarget");
const MetabolicEngine = require("../core/MetabolicEngine");
const MicronutrientEngine = require("../core/MicronutrientEngine");

exports.generateUserTargets = async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    const { current_weight, height, dob, gender, activityLevel, goals } = user;
    
    // Age Calculation
    let age = 25; // Default fallback
    if (dob) {
        age = new Date().getFullYear() - new Date(dob).getFullYear();
    }
    const primaryGoal = (Array.isArray(goals) && goals.length > 0) ? goals[0] : "maintain";

    // 1. Run Metabolic Engine
    const bmr = MetabolicEngine.getBMR(current_weight, height, age, gender);
    const tdee = MetabolicEngine.getTDEE(bmr, activityLevel);
    const targetCalories = MetabolicEngine.getBaseCalories(tdee, primaryGoal);
    const macros = MetabolicEngine.getMacros(targetCalories, current_weight, primaryGoal);

    // 2. Run Micronutrient Engine
    const micros = MicronutrientEngine.calculateTargets(gender, age, current_weight);

    // 3. Save to Database
    const updateData = {
        ...macros,
        vitamins: micros.vitamins,
        minerals: micros.minerals,
        water_ml: micros.water_ml,
        metabolic: { bmr, tdee, bodyFatPercentage: 0 /* calculate navy body fat later */ }
    };

    await NutritionTarget.findOneAndUpdate(
        { userId: user._id },
        updateData,
        { upsert: true, new: true }
    );

    return updateData;
};