const supabase = require("../config/supabase");
const IS_TESTING = process.env.NODE_ENV !== "production";

exports.checkUser = async (req, res) => {
    try {
        const uid = req.user.firebase_uid || req.user.uid;
        const { data: user } = await supabase.from('users').select('*').eq('firebase_uid', uid).maybeSingle();

        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        if (user.is_deleted) return res.status(403).json({ success: false, message: "Account already deleted" });

        if (IS_TESTING) {
            return res.status(200).json({ 
                success: true, 
                isDataComplete: true, 
                isWorkoutComplete: true, 
                isTargetComplete: true, 
                isSourceComplete: true,
                hasFilledSource: true 
            });
        }

        // 1. Master Check (Basic Info): इसके बिना ऐप होम पर नहीं जाएगी
        const isDataComplete = !!user.name && !!user.gender && !!user.dob && 
                               user.height > 0 && user.current_weight > 0 && 
                               !!user.activity_level && !!user.mobile;
        
        // 2. Workout Complete Check: यह तय करेगा कि HomeScreen पर Workout Card LOCK होगा या नहीं
        const isWorkoutComplete = 
            (user.focus_areas?.length || 0) > 0 && 
            (user.training_days?.length || 0) > 0 && 
            !!user.workout_duration && 
            !!user.workout_split;

        // 3. Target Complete Check: चूंकि ये Auto-fill होंगे, तो ये लगभग हमेशा True रहेंगे
        // 🔥 टिप: अगर आपने Calorie/Protein के नए कॉलम बनाए हैं, तो उन्हें यहाँ जोड़ें
        const isTargetComplete = (user.step_target || 0) > 0 && 
                                 (user.sleep_target || 0) > 0 && 
                                 (user.water_target || 0) > 0;

        // 4. Source Check: जैसा आपने कहा, इसे optional रखना है
        const isSourceComplete = true; 
        const hasFilledSource = !!user.referral || !!user.about_us;

        return res.status(200).json({ 
            success: true, 
            isDataComplete,      // Android इसे "Entry Key" की तरह यूज़ करेगा
            isWorkoutComplete,   // Android इसे "Lock/Unlock" के लिए यूज़ करेगा
            isTargetComplete, 
            isSourceComplete,
            hasFilledSource,
            user: {              // Optional: कुछ बेसिक डेटा वापस भेजें
                name: user.name,
                membership: user.membership
            }
        });
        
    } catch (error) {
        console.error("❌ checkUser error:", error.message);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
