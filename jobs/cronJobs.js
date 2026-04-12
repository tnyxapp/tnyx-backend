// jobs/cronJobs.js
const cron = require("node-cron");
const supabase = require("../config/supabase"); // 🔥 Supabase Import

// 0 0 * * * : हर दिन रात 12:00 बजे (Midnight) रन करेगा
// timezone: "Asia/Kolkata" सुनिश्चित करता है कि यह भारत के समय अनुसार ही चले
cron.schedule("0 0 * * *", async () => {
    console.log("⏳ Running Daily AI Credit Reset Job...");

    try {
        // Business Logic
        const planConfig = {
            free: { credits: 10 },
            pro: { credits: 100 },
            premium: { credits: 500 }
        };

        // 🔥 Optimized Approach: 3 बार कोड लिखने के बजाय Loop का इस्तेमाल
        for (const plan in planConfig) {
            const { error } = await supabase
                .from("users")
                .update({
                    ai_credits: planConfig[plan].credits,
                    ai_used: 0
                })
                .eq("ai_plan", plan);

            // अगर किसी खास प्लान में एरर आता है, तो उसे लॉग करें
            if (error) {
                console.error(`❌ Error resetting [${plan}] users:`, error.message);
            } else {
                console.log(`✅ [${plan}] users reset successfully.`);
            }
        }

        console.log("🏆 Daily Credit Reset Complete!");
    } catch (error) {
        // Unexpected server crash से बचाव
        console.error("🔴 Cron Job Error:", error.message);
    }
}, {
    scheduled: true,
    timezone: "Asia/Kolkata" // 👈 Timezone Issue Fix
});
