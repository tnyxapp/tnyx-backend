// jobs/cronJobs.js
const cron = require("node-cron");
const supabase = require("../config/supabase"); // 🔥 Supabase Import

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
        const { error: errFree } = await supabase
            .from('users')
            .update({ ai_credits: planConfig.free.credits, ai_used: 0 })
            .eq('ai_plan', 'free');
        if (errFree) console.error("Error resetting free users:", errFree);

        // 2. Pro Users के क्रेडिट्स रीसेट करें
        const { error: errPro } = await supabase
            .from('users')
            .update({ ai_credits: planConfig.pro.credits, ai_used: 0 })
            .eq('ai_plan', 'pro');
        if (errPro) console.error("Error resetting pro users:", errPro);

        // 3. Premium Users के क्रेडिट्स रीसेट करें
        const { error: errPremium } = await supabase
            .from('users')
            .update({ ai_credits: planConfig.premium.credits, ai_used: 0 })
            .eq('ai_plan', 'premium');
        if (errPremium) console.error("Error resetting premium users:", errPremium);

        console.log("✅ Daily Credit Reset Complete!");
    } catch (error) {
        console.error("🔴 Cron Job Error:", error);
    }
});