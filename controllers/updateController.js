// controllers/userController.js
const supabase = require("../config/supabase");

// ==========================================
// ✅ SMART UPDATE PROFILE
// ==========================================
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id; 
        const data = req.body;
        const safeNumber = (val) => isNaN(Number(val)) ? 0 : Number(val);

        const updateData = {};

        // 🔥 BASIC PROFILE
        if (data.name !== undefined) updateData.name = data.name;
        if (data.gender !== undefined && data.gender.trim() !== "") updateData.gender = data.gender.toLowerCase().trim();
        // ... (बाकी का सारा अपडेट लॉजिक जो हमने पिछले मैसेज में डिस्कस किया था) ...

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, message: "No data provided to update" });
        }

        const { data: updatedUser, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;

        return res.status(200).json({ success: true, message: "Profile updated", data: updatedUser });

    } catch (error) {
        console.error("❌ Update Error:", error);
        return res.status(500).json({ success: false, message: "Failed to update profile" });
    }
};
