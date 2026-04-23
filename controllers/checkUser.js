// controllers/checkUser.js
const supabase = require("../config/supabase");
const IS_TESTING = process.env.NODE_ENV !== "production";

exports.checkUser = async (req, res) => {
    try {
        const uid = req.user.firebase_uid || req.user.uid;
        
        // 1. यूज़र का डेटा और nutrition_targets चेक करें
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

        const isTargetComplete = user.nutrition_targets && user.nutrition_targets.length > 0;

        const isSourceComplete = true; 
        const hasFilledSource = !!user.referral || !!user.about_us;

        // ==========================================
        // 🔥 2. NAYA LOGIC: Initial Weight निकालें
        // ==========================================
        const { data: oldestWeightLog } = await supabase
            .from('weight_logs')
            .select('weight_kg')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true }) // सबसे पुराना पहले
            .limit(1)
            .maybeSingle();

        // अगर weight_logs में रिकॉर्ड है तो वो लें, वरना users टेबल का current_weight लें
        const initialWeight = oldestWeightLog ? oldestWeightLog.weight_kg : user.current_weight;
        // ==========================================

        return res.status(200).json({ 
            success: true, 
            isDataComplete, 
            isWorkoutComplete, 
            isTargetComplete, 
            isSourceComplete,
            hasFilledSource,
            user: { 
                name: user.name,
                mobile: user.mobile || "",
                // 🔥 3. Android ऐप के लिए वज़न का डेटा यहाँ भेजें
                currentWeight: user.current_weight,
                targetWeight: user.target_weight,
                initialWeight: initialWeight
            }
        });
        
    } catch (error) {
        console.error("❌ checkUser error:", error.message);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};