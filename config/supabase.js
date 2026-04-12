// config/supabase.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
// 🔥 ANON_KEY की जगह SERVICE_KEY का इस्तेमाल (Admin Privileges के लिए)
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; 

// 🚨 Fail-Fast: अगर keys नहीं हैं, तो सर्वर तुरंत बंद कर दो
if (!supabaseUrl || !supabaseKey) {
    console.error("🔴 CRITICAL ERROR: Supabase URL or SERVICE KEY is missing in .env file!");
    process.exit(1); // 👈 Server stop
}

// Supabase client initialization (Admin Privileges)
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
