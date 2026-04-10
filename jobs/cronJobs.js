//jobs/cronJobs.js
const cron = require("node-cron");
const User = require("../models/User");

// 0 0 * * * का मतलब है: हर रात 12:00 बजे (Midnight) रन करो
cron.schedule("0 0 * * *", async () => {
    console.log("⏳ Running Daily AI Credit Reset Job...");

    try {
        const planConfig = {
            free: { credits: 10 },
            pro: { credits: 100 },
            premium: { credits: 500 }
        };

        // 1. Free Users के क्रेडिट्स रीसेट करें
        await User.updateMany(
            { aiPlan: "free" },
            { $set: { aiCredits: planConfig.free.credits, aiUsed: 0 } }
        );

        // 2. Pro Users के क्रेडिट्स रीसेट करें
        await User.updateMany(
            { aiPlan: "pro" },
            { $set: { aiCredits: planConfig.pro.credits, aiUsed: 0 } }
        );

        // 3. Premium Users के क्रेडिट्स रीसेट करें
        await User.updateMany(
            { aiPlan: "premium" },
            { $set: { aiCredits: planConfig.premium.credits, aiUsed: 0 } }
        );

        console.log("✅ Daily Credit Reset Complete!");
    } catch (error) {
        console.error("🔴 Cron Job Error:", error);
    }
});