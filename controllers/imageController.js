//controllers/imageController.js
const User = require("../models/User");
const cloudinary = require("../config/cloudinary");

exports.uploadProfileImage = async (req, res) => {
    try {
        const userId = req.user._id;

        // 1. चेक करो कि फाइल आई है या नहीं (Multer के ज़रिए)
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No image file provided" });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        // 2. 🔥 पुरानी फोटो डिलीट करो (Optional but Recommended)
        // अगर पुरानी फोटो भी Cloudinary की थी (Firebase की नहीं), तो उसे डिलीट कर दो ताकि स्पेस बचे
        if (user.profileImage && user.profileImage.includes("cloudinary")) {
             // URL से public_id निकालो और डिलीट करो (Advanced)
             const publicId = user.profileImage.split('/').pop().split('.')[0]; 
             await cloudinary.uploader.destroy(publicId);
        }

        // 3. नई फोटो Cloudinary पर अपलोड करो (यहाँ Multer के buffer का इस्तेमाल हो रहा है)
        // या अगर तुम multer-storage-cloudinary इस्तेमाल कर रहे हो, तो सीधे req.file.path मिल जाएगा
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: "tnyx_profiles",
            transformation: [{ width: 500, height: 500, crop: "fill" }] // 🔥 Auto-crop & Resize
        });

        // 4. MongoDB में नया URL सेव करो
        user.profileImage = result.secure_url;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Profile photo updated successfully",
            profileImage: user.profileImage
        });

    } catch (error) {
        console.error("Profile Upload Error:", error);
        return res.status(500).json({ success: false, message: "Failed to upload profile photo" });
    }
};