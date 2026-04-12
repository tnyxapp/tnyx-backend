//controllers/weightController.js
const supabase = require("../config/supabase");

exports.addWeight = async (req, res) => {
  try {
    const userId = req.user.id;
    const { weight_kg, body_fat_pct } = req.body;

    const { error } = await supabase
      .from("weight_logs")
      .insert([{ user_id: userId, weight_kg, body_fat_pct }]);

    if (error) throw error;

    return res.json({ success: true });

  } catch (error) {
    return res.status(500).json({ success: false });
  }
};