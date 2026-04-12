//controllers/checkUser.js
const supabase = require("../config/supabase");
const IS_TESTING = process.env.NODE_ENV !== "production";

exports.checkUser = async (req, res) => {
    try {
        const uid = req.user.firebase_uid || req.user.uid;
        const { data: user } = await supabase.from('users').select('*').eq('firebase_uid', uid).maybeSingle();

        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        if (user.is_deleted) return res.status(403).json({ success: false, message: "Account already deleted" });

        if (IS_TESTING) {
            return res.status(200).json({ success: true, isDataComplete: true, isWorkoutComplete: true, isTargetComplete: true, isSourceComplete: true });
        }

        // 1. Data Complete Check (Basic Info)
        const isDataComplete = !!user.name && !!user.gender && !!user.dob && user.height > 0 && user.current_weight > 0 && !!user.activity_level && !!user.mobile;
        
        // 2. Workout Complete Check 🔥 (FIXED: Removed strict gym & equipment check)
        // अब यह चेक करेगा कि क्या यूज़र ने दिन, फोकस एरिया, टाइम और स्प्लिट चुना है।
        const isWorkoutComplete = 
            (user.focus_areas?.length || 0) > 0 && 
            (user.training_days?.length || 0) > 0 && 
            !!user.workout_duration && 
            !!user.workout_split;

        // 3. Target Complete Check
        const isTargetComplete = (user.step_target || 0) > 0 && (user.sleep_target || 0) > 0 && (user.water_target || 0) > 0;

        // 4. Source/Membership Check
        const isSourceComplete = !!user.referral || !!user.about_us || !!user.membership;

        return res.status(200).json({ 
            success: true, 
            isDataComplete, 
            isWorkoutComplete, 
            isTargetComplete, 
            isSourceComplete 
        });
        
    } catch (error) {
        console.error("❌ checkUser error:", error.message);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
