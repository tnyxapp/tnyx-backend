//controllers/userController.js
const supabase = require("../config/supabase");

// ==========================================
// ✅ START FREE TRIAL
// ==========================================
exports.startFreeTrial = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id; 
        const { deviceId } = req.body;

        if (!deviceId) return res.status(400).json({ success: false, message: "Device ID is required" });

        // 1. User Check
        const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
        if (user.is_trial_used) return res.status(403).json({ success: false, message: "Trial already used." });

        // 2. Device Check
        let { data: deviceRecord } = await supabase.from('devices').select('*').eq('device_id', deviceId).maybeSingle();
        if (deviceRecord && deviceRecord.trial_used) {
            return res.status(403).json({ success: false, message: "Device already used for trial." });
        }

        // 3. Start Trial
        const now = new Date();
        const trialEndDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        await supabase.from('users').update({
            trial_start: now,
            trial_end: trialEndDate,
            is_trial_used: true,
            ai_plan: "pro",
            ai_credits: (user.ai_credits || 0) + 50
        }).eq('id', userId);

        // 4. Update Device
        if (!deviceRecord) {
            await supabase.from('devices').insert([{ device_id: deviceId, trial_used: true }]);
        } else {
            await supabase.from('devices').update({ trial_used: true }).eq('device_id', deviceId);
        }

        return res.status(200).json({ success: true, message: "7-Day Trial started!", trialEnd: trialEndDate });
    } catch (error) {
        console.error("🔴 Start Trial Error:", error);
        return res.status(500).json({ success: false, message: "Failed to start trial" });
    }
};

// ==========================================
// ✅ SMART UPDATE PROFILE (Dynamic Patch)
// ==========================================
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id; 
        const data = req.body;
        const safeNumber = (val) => isNaN(Number(val)) ? 0 : Number(val);

        const updateData = {};

        // 🔥 1. BASIC PROFILE
        if (data.name !== undefined) updateData.name = data.name;
        if (data.gender !== undefined && data.gender.trim() !== "") updateData.gender = data.gender.toLowerCase().trim();
        if (data.dob !== undefined) updateData.dob = new Date(Number(data.dob) || data.dob).toISOString();
        if (data.height !== undefined) updateData.height = safeNumber(data.height);
        if (data.currentWeight !== undefined) updateData.current_weight = safeNumber(data.currentWeight);
        if (data.targetWeight !== undefined) updateData.target_weight = safeNumber(data.targetWeight);
        if (data.activityLevel !== undefined) updateData.activity_level = data.activityLevel;
        if (data.goals !== undefined && Array.isArray(data.goals)) updateData.goals = data.goals;

        // 🔥 2. WORKOUT PREFERENCES
        if (data.gymAccess !== undefined) updateData.gym_access = data.gymAccess;
        if (data.trainingDays !== undefined && Array.isArray(data.trainingDays)) updateData.training_days = data.trainingDays;
        if (data.equipment !== undefined && Array.isArray(data.equipment)) updateData.equipment = data.equipment;
        if (data.focusAreas !== undefined && Array.isArray(data.focusAreas)) updateData.focus_areas = data.focusAreas;
        if (data.workoutDuration !== undefined) updateData.workout_duration = data.workoutDuration;
        if (data.workoutSplit !== undefined) updateData.workout_split = data.workoutSplit;

        // 🔥 3. TARGETS
        if (data.stepTarget !== undefined) updateData.step_target = safeNumber(data.stepTarget);
        if (data.waterTarget !== undefined) updateData.water_target = safeNumber(data.waterTarget);
        if (data.sleepTarget !== undefined) updateData.sleep_target = safeNumber(data.sleepTarget);

        // 🚨 अगर कोई डेटा नहीं भेजा गया
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, message: "No data provided to update" });
        }

        // 🔥 4. सिर्फ उसी डेटा को अपडेट करें
        const { data: updatedUser, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;

        return res.status(200).json({ 
            success: true, 
            message: "Profile updated successfully", 
            data: updatedUser 
        });

    } catch (error) {
        console.error("❌ Update Error:", error);
        return res.status(500).json({ success: false, message: "Failed to update profile" });
    }
};
