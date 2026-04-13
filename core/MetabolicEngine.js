// core/MetabolicEngine.js

class MetabolicEngine {
    // 1. Calculate BMR (Mifflin-St Jeor Equation)
    static getBMR(weight, heightCm, age, gender) {
        if (gender === "male") {
            return (10 * weight) + (6.25 * heightCm) - (5 * age) + 5;
        } else {
            return (10 * weight) + (6.25 * heightCm) - (5 * age) - 161;
        }
    }

    // 2. Calculate TDEE
    static getTDEE(bmr, activityLevel) {
    const activityMap = {
        sedentary: 1.2,
        light: 1.375,
        active: 1.55,
        very_active: 1.725,
        dynamic: 1.9
    };

    const multiplier = activityMap[activityLevel] || 1.2;

    return Math.round(bmr * multiplier);
}

    // 3. Dynamic Base Calories (Goal Setup)
    static getBaseCalories(tdee, goal) {
    switch(goal) {
        case "lose_weight": return tdee - 500;
        case "build_muscle": return tdee + 300; // FIX
        case "keep_fit": return tdee; // FIX
        default: return tdee;
    }
}

    // 4. Calculate Macros (Protein, Carbs, Fats)
    static getMacros(calories, weightKg, goal) {
        // High protein for weight loss/muscle gain
        const proteinPerKg = (goal === "lose_weight" || goal === "gain_muscle") ? 2.0 : 1.6;
        const proteinGrams = Math.round(weightKg * proteinPerKg);
        const fatGrams = Math.round((calories * 0.25) / 9); // 25% of calories from fat
        
        const remainingCalories = calories - (proteinGrams * 4) - (fatGrams * 9);
        const carbGrams = Math.round(Math.max(0, remainingCalories / 4));

        return {
            calories: Math.round(calories),
            protein: proteinGrams,
            fats: fatGrams,
            carbs: carbGrams,
            fiber: Math.round((calories / 1000) * 14) // 14g fiber per 1000 kcal
        };
    }
}

module.exports = MetabolicEngine;