// core/MicronutrientEngine.js

class MicronutrientEngine {
    static calculateTargets(gender, age, weightKg, isPregnant = false) {
        const isMale = gender === "male";

        return {
            vitamins: {
                // तुम्हारा एक्सेल लॉजिक यहाँ आएगा
                B3_mg: isMale ? 16 : 14, 
                C_mg: isMale ? 90 : 75,
                D_IU: age > 70 ? 800 : 600,
                // ... बाकी विटामिन्स
            },
            minerals: {
                Iron_mg: isMale ? 8 : (age <= 50 ? 18 : 8), // Females < 50 need more iron
                Zinc_mg: isMale ? 11 : 8,
                Calcium_mg: age > 50 ? 1200 : 1000,
                // ... बाकी मिनरल्स
            },
            water_ml: weightKg * 35 // Base: 35ml per kg of body weight
        };
    }
}

module.exports = MicronutrientEngine;