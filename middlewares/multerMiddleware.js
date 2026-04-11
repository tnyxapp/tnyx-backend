// middlewares/multerMiddleware.js
const multer = require("multer");

// 🔥 Temporary Memory Storage (Supabase के लिए buffer चाहिए)
const storage = multer.memoryStorage();

// File filter (सिर्फ Images)
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Only images are allowed"), false);
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

module.exports = upload;