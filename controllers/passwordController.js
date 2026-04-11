const admin = require("../config/firebase");
const supabase = require("../config/supabase");

exports.resetPassword = async (req, res) => {
    try {
        let { email, otp, newPassword } = req.body;
        email = email?.toLowerCase().trim();

        if (!email || !otp || !newPassword) return res.status(400).json({ success: false, message: "All fields required" });
        if (!/^\d{6}$/.test(otp)) return res.status(400).json({ success: false, message: "Invalid OTP format" });

        const { data: user } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        if (user.is_deleted) return res.status(403).json({ success: false, message: "Account deleted" });

        const { data: record } = await supabase.from('otps').select('*').eq('email', email).order('created_at', { ascending: false }).limit(1).maybeSingle();
        
        if (!record) return res.status(400).json({ success: false, message: "Invalid OTP" });
        if (record.attempts >= 3) return res.status(429).json({ success: false, message: "Too many attempts" });

        if (new Date(record.expires_at) < new Date()) {
            await supabase.from('otps').delete().eq('email', email);
            return res.status(400).json({ success: false, message: "OTP expired" });
        }

        if (record.otp !== otp) {
            await supabase.from('otps').update({ attempts: record.attempts + 1 }).eq('id', record.id);
            return res.status(400).json({ success: false, message: "Invalid OTP" });
        }

        await admin.auth().updateUser(user.firebase_uid, { password: newPassword });
        await admin.auth().revokeRefreshTokens(user.firebase_uid);
        await supabase.from('otps').delete().eq('email', email);

        return res.status(200).json({ success: true, message: "Password updated successfully ✅" });

    } catch (error) {
        console.error("❌ resetPassword error:", error.message);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};