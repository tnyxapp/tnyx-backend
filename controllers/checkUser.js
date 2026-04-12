// controllers/checkUser.js
const supabase = require("../config/supabase");
const IS_TESTING = process.env.NODE_ENV !== "production";

exports.checkUser = async (req, res) => {
    try {
        const uid = req.user.firebase_uid || req.user.uid;
        
        // 🔥 Joined Query: nutrition_targets की मौजूदगी चेक करने के लिए
        const { data: user } = await supabase
            .from('users')
            .select('*, nutrition_targets(calories)') 
            .eq('firebase_uid', uid)
            .maybeSingle();

        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        if (user.is_deleted) return res.status(403).json({ success: false, message: "Account already deleted" });

        if (IS_TESTING) {
            return res.status(200).json({ success: true, isDataComplete: true, isWorkoutComplete: true, isTargetComplete: true, isSourceComplete: true, hasFilledSource: true });
        }

        const isDataComplete = !!user.name && !!user.gender && !!user.dob && 
                               user.height > 0 && user.current_weight > 0 && 
                               !!user.activity_level && !!user.mobile;
        
        const isWorkoutComplete = 
            (user.focus_areas?.length || 0) > 0 && 
            (user.training_days?.length || 0) > 0 && 
            !!user.workout_duration && 
            !!user.workout_split;

        // 🔥 अब Target Complete तभी होगा जब 'nutrition_targets' टेबल में रिकॉर्ड हो
        const isTargetComplete = user.nutrition_targets && user.nutrition_targets.length > 0;

        const isSourceComplete = true; 
        const hasFilledSource = !!user.referral || !!user.about_us;

        return res.status(200).json({ 
            success: true, 
            isDataComplete, 
            isWorkoutComplete, 
            isTargetComplete, 
            isSourceComplete,
            hasFilledSource,
            user: { 
                name: user.name,
                mobile: user.mobile || "" 
            }
        });
        
    } catch (error) {
        console.error("❌ checkUser error:", error.message);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
