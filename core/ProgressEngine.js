class ProgressEngine {

    /**
     * 1. Moving Averages & Weight Change
     * @param {Array} weeklyAverages - [CurrentWeekAvg, LastWeekAvg, TwoWeeksAgoAvg, ThreeWeeksAgoAvg]
     */
    static analyzeWeightTrends(weeklyAverages) {
        const [current, last1, last2, last3] = weeklyAverages;
        
        const weeklyChange = current && last1 ? (current - last1) : 0;
        
        return {
            currentWeekAvg: current || 0,
            lastWeekAvg: last1 || 0,
            twoWeeksAgoAvg: last2 || 0,
            threeWeeksAgoAvg: last3 || 0,
            weeklyChange: parseFloat(weeklyChange.toFixed(2))
        };
    }

    /**
     * 2. Plateau Detection (अगर वज़न 2-3 हफ़्ते से नहीं गिरा है)
     * @param {Object} trends - analyzeWeightTrends का आउटपुट
     * @param {String} goal - "lose_weight", "gain_muscle" etc.
     */
    static detectPlateau(trends, goal) {
        // अगर 0.2kg से कम का बदलाव है, तो उसे Plateau (रुका हुआ) मानेंगे
        const threshold = 0.2; 
        
        let is2WeekPlateau = false;
        let is3WeekPlateau = false;

        if (goal === "lose_weight") {
            is2WeekPlateau = trends.currentWeekAvg > 0 && trends.twoWeeksAgoAvg > 0 && 
                             (trends.twoWeeksAgoAvg - trends.currentWeekAvg) <= threshold;
                             
            is3WeekPlateau = trends.currentWeekAvg > 0 && trends.threeWeeksAgoAvg > 0 && 
                             (trends.threeWeeksAgoAvg - trends.currentWeekAvg) <= threshold;
        }

        let plateauCount = 0;
        if (is2WeekPlateau) plateauCount = 2;
        if (is3WeekPlateau) plateauCount = 3;

        return {
            is2WeekPlateau,
            is3WeekPlateau,
            plateauCount,
            status: is3WeekPlateau ? "Severe Plateau" : (is2WeekPlateau ? "Moderate Plateau" : "Progressing")
        };
    }

    /**
     * 3. Adaptive Adjustment (अगर प्लेटो है, तो कैलोरी घटाएं या बढ़ाएं)
     * @param {Object} plateauInfo - detectPlateau का आउटपुट
     * @param {Number} currentTargetCalories - वर्तमान कैलोरी
     */
    static calculateAdaptiveAdjustment(plateauInfo, currentTargetCalories) {
        let suggestedAdjustment = 0;
        let message = "Keep going, you are on track!";

        if (plateauInfo.is3WeekPlateau) {
            // 3 हफ्ते से वज़न नहीं गिरा: Diet Break या Refeed का समय
            suggestedAdjustment = +300; // मेटाबॉलिज्म रीसेट करने के लिए
            message = "Metabolic adaptation detected. Recommend a Refeed/Diet Break.";
        } 
        else if (plateauInfo.is2WeekPlateau) {
            // 2 हफ्ते से रुका है: कैलोरी थोड़ी और कम करें (Max limit apply करेंगे बाद में)
            suggestedAdjustment = -100;
            message = "Slight plateau. Suggested dropping 100 kcal.";
        }

        return {
            adjustmentKcal: suggestedAdjustment,
            newSuggestedCalories: currentTargetCalories + suggestedAdjustment,
            message
        };
    }

    /**
     * 4. Refeed Macros (जब मेटाबॉलिज्म स्लो हो जाए, तो एक दिन हाई कार्ब्स खाना)
     * Refeed में फैट कम रखते हैं, प्रोटीन नॉर्मल, और कार्ब्स बहुत ज़्यादा!
     * @param {Number} maintenanceCalories - TDEE (Maintenance)
     * @param {Number} weightKg - यूज़र का वज़न
     */
    static calculateRefeedMacros(maintenanceCalories, weightKg) {
        // Refeed Calories हमेशा Maintenance पर या उससे 100-200 ज़्यादा होती हैं
        const refeedCalories = maintenanceCalories + 150; 
        
        // प्रोटीन: 1.6g per kg
        const proteinGrams = Math.round(weightKg * 1.6);
        
        // फैट: Refeed के दिन बहुत कम रखते हैं (लगभग 15% - 20% या 1g per kg से कम)
        const fatGrams = Math.round(weightKg * 0.8); 
        
        // कार्ब्स: बाकी बची हुई सारी कैलोरी कार्ब्स से आएंगी (Leptin हॉर्मोन बढ़ाने के लिए)
        const remainingKcal = refeedCalories - (proteinGrams * 4) - (fatGrams * 9);
        const carbGrams = Math.round(Math.max(0, remainingKcal / 4));

        return {
            refeedStatus: "Active",
            refeedCalories: Math.round(refeedCalories),
            protein: proteinGrams,
            fats: fatGrams,
            carbs: carbGrams,
            fiber: Math.round((refeedCalories / 1000) * 14)
        };
    }

    /**
     * 5. Projections (कितने हफ्ते लगेंगे टारगेट तक पहुँचने में)
     */
    static calculateProjections(currentWeight, targetWeight, expectedWeeklyChange) {
        if (!expectedWeeklyChange || expectedWeeklyChange === 0) return { projectedWeeks: "Unknown" };
        
        const weightDifference = Math.abs(currentWeight - targetWeight);
        const projectedWeeks = weightDifference / Math.abs(expectedWeeklyChange);
        
        return {
            weightDifference: parseFloat(weightDifference.toFixed(2)),
            expectedWeeklyChange: parseFloat(expectedWeeklyChange.toFixed(2)),
            projectedWeeks: Math.ceil(projectedWeeks)
        };
    }
}

module.exports = ProgressEngine;