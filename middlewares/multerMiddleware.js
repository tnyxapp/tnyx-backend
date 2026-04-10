//middlewares/multerMiddleware.js
const multer = require("multer");
const path = require("path");

// Temporary storage (Render/Heroku जैसे सर्वर्स के लिए best)
const storage = multer.diskStorage({
    filename: function (req, file, cb) {
        cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
    }
});

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