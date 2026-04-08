const { signupService } = require("../services/authService");


// ✅ SIGNUP
exports.signup = async (req, res) => {
    try {
        let { email, password, name } = req.body;

        // 🔥 sanitize input
        email = email?.toLowerCase().trim();
        name = name?.trim();

        // 🔥 validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email, password are required"
            });
        }

        // 🔥 Email validation (improved)
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
        success: false,
        message: "Invalid email format"
    });
}

// 🔥 Strong password validation
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;

if (!passwordRegex.test(password)) {
    return res.status(400).json({
        success: false,
        message: "Password must have at least 6 characters, including 1 uppercase, 1 lowercase, 1 number and 1 special character"
    });
}

        const result = await signupService({
            ...req.body,
            email,
            name
        });

        res.status(201).json(result);

    } catch (error) {

        let statusCode = 400;

        if (error.message.includes("deleted")) statusCode = 403;
        if (error.message.includes("exists")) statusCode = 409;

        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};



// ✅ GOOGLE SYNC (future ready)
exports.googleSync = async (req, res) => {
    try {
        // 1. Android se aane wala data lein
        const { email, name, firebaseUid } = req.body;
        
        // 2. Middleware se aane wali UID (agar aapne verifyToken lagaya hai)
        // Agar Android se firebaseUid bhej rahe hain toh seedha wahi use kar sakte hain
        const uid = firebaseUid || req.user.uid; 

        if (!email || !name || !uid) {
            return res.status(400).json({ 
                success: false, 
                message: "Email, Name and FirebaseUid are required" 
            });
        }

        // 3. signupService ko call karein aur password bypass karein
        const result = await signupService({
            ...req.body,
            firebaseUid: uid,
            password: "GOOGLE_USER_" + uid // Dummy password validation bypass ke liye
        });

        // 4. Result bhej dein
        return res.status(200).json(result);

    } catch (error) {
        console.error("❌ Google Sync Error:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

//3️⃣ TRUECALLER LOGIN
exports.truecallerLogin = async (req, res) => {
    try {
        let { name, mobile, email } = req.body;

        mobile = mobile?.trim();

        if (!mobile) {
            return res.status(400).json({
                success: false,
                message: "Mobile number is required"
            });
        }

        const result = await signupService({
            name: name || "User",
            mobile,
            email: email?.toLowerCase().trim() || "",
            authProvider: "truecaller"
        });

        return res.status(200).json(result);

    } catch (error) {
        console.error("❌ Truecaller Error:", error.message);

        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};