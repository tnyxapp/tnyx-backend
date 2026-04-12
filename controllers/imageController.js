const supabase = require("../config/supabase");

exports.uploadProfileImage = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;

        // 1. फाइल मौजूद है या नहीं?
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No image file provided" });
        }

        // 2. 🔥 Strict File Type Validation
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedTypes.includes(req.file.mimetype)) {
            return res.status(400).json({
                success: false,
                message: "Invalid image format. Only JPEG, PNG, and WEBP are allowed."
            });
        }

        // 3. यूज़र का डेटा लाएं
        const { data: user } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // 4. 🔥 पुरानी फोटो डिलीट करें (Error Logging के साथ)
        if (user.profile_image) {
            const oldFileName = user.profile_image.split('/').pop();
            
            if (oldFileName) {
                const { error: deleteError } = await supabase.storage
                    .from('tnyx_profiles')
                    .remove([oldFileName]);

                if (deleteError) {
                    console.error("⚠️ Old image delete failed:", deleteError.message);
                    // हम यहाँ process नहीं रोकेंगे, क्योंकि पुरानी फोटो न हटने से नया अपलोड नहीं रुकना चाहिए
                }
            }
        }

        // 5. सुरक्षित एक्सटेंशन और नया नाम
        const fileExt = req.file.mimetype.split('/')[1]; 
        const fileName = `${userId}_${Date.now()}.${fileExt}`;
        
        // 6. 🔥 Supabase Storage में अपलोड (Clean Variable)
        const { error: uploadError } = await supabase.storage
            .from('tnyx_profiles')
            .upload(fileName, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: true
            });

        if (uploadError) {
            return res.status(500).json({ success: false, message: uploadError.message });
        }

        // 7. Public URL निकालें
        const { data: publicUrlData } = supabase.storage.from('tnyx_profiles').getPublicUrl(fileName);
        const imageUrl = publicUrlData.publicUrl;

        // 8. 🔥 Database अपडेट करें (Strict Error Checking)
        const { error: updateError } = await supabase
            .from('users')
            .update({ profile_image: imageUrl })
            .eq('id', userId);

        if (updateError) {
            return res.status(500).json({
                success: false,
                message: "Failed to update profile image in database"
            });
        }

        // 9. Success Response
        return res.status(200).json({
            success: true,
            message: "Profile photo updated successfully",
            profileImage: imageUrl
        });

    } catch (error) {
        console.error("❌ Profile Upload Error:", error);
        return res.status(500).json({ success: false, message: "Failed to upload profile photo" });
    }
};
