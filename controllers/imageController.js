const supabase = require("../config/supabase");

exports.uploadProfileImage = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;

        if (!req.file) return res.status(400).json({ success: false, message: "No image file provided" });

        const { data: user } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        // Supabase Storage में अपलोड (S3 Power)
        const fileExt = req.file.originalname.split('.').pop();
        const fileName = `${userId}_${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('tnyx_profiles')
            .upload(fileName, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: true
            });

        if (uploadError) throw uploadError;

        // Public URL निकालें
        const { data: publicUrlData } = supabase.storage.from('tnyx_profiles').getPublicUrl(fileName);
        const imageUrl = publicUrlData.publicUrl;

        // Database अपडेट करें
        await supabase.from('users').update({ profile_image: imageUrl }).eq('id', userId);

        return res.status(200).json({
            success: true,
            message: "Profile photo updated successfully",
            profileImage: imageUrl
        });

    } catch (error) {
        console.error("Profile Upload Error:", error);
        return res.status(500).json({ success: false, message: "Failed to upload profile photo" });
    }
};