// controllers/targetController.js
const supabase = require("../config/supabase");
const MetabolicEngine = require("../core/MetabolicEngine");
const MicronutrientEngine = require("../core/MicronutrientEngine");

exports.generateUserTargets = async (userId) => {
    const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
    if (!user) throw new Error("User not found");

    const { current_weight, height, dob, gender, activity_level, goals } = user;

    if (!current_weight || !height) {
    throw new Error("Incomplete profile data");
    }
    let age = 25;
    if (dob) age = new Date().getFullYear() - new Date(dob).getFullYear();

    // ✅ FIXED GOAL LOGIC
    const mainGoals = ["build_muscle", "lose_weight", "keep_fit"];
    const primaryGoal = (Array.isArray(goals))
        ? goals.find(g => mainGoals.includes(g)) || "keep_fit"
        : "keep_fit";

    const bmr = MetabolicEngine.getBMR(current_weight, height, age, gender);
    const tdee = MetabolicEngine.getTDEE(bmr, activity_level);
    const targetCalories = MetabolicEngine.getBaseCalories(tdee, primaryGoal);
    const macros = MetabolicEngine.getMacros(targetCalories, current_weight, primaryGoal);
    const micros = MicronutrientEngine.calculateTargets(gender, age, current_weight);

    const updateData = {
        user_id: userId, // Foreign Key
        ...macros,
        vitamins: micros.vitamins,
        minerals: micros.minerals,
        water_ml: micros.water_ml,
        metabolic: { bmr, tdee, bodyFatPercentage: 0 }
    };

    // Upsert (Insert if not exists, Update if exists)
    await supabase.from('nutrition_targets').upsert(updateData, { onConflict: 'user_id' });
    return updateData;
};

exports.calculateTargetsController = async (req, res) => {
    try {
        const userId = req.user.id;

        const data = await exports.generateUserTargets(userId);

        return res.status(200).json({
            success: true,
            data
        });

    } catch (error) {
        console.error("Target Controller Error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to calculate targets"
        });
    }
};