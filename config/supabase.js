// config/supabase.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
// 🔥 ANON_KEY की जगह SERVICE_KEY का इस्तेमाल
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; 

if (!supabaseUrl || !supabaseKey) {
    console.error("🔴 Supabase URL or SERVICE KEY is missing in .env file!");
}

// Supabase client initialization (Admin Privileges)
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;