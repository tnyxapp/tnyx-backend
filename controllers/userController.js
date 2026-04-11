//controllers/userController.js
const supabase = require("../config/supabase");

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