//controllers/waterController.js
const supabase = require("../config/supabase");

exports.addWaterLog = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount_ml } = req.body;

    const { error } = await supabase
      .from("water_logs")
      .insert([{ user_id: userId, amount_ml }]);

    if (error) throw error;

    return res.json({ success: true, message: "Water logged" });

  } catch (error) {
    return res.status(500).json({ success: false });
  }
};

exports.getDailyWater = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.query;

    const { data, error } = await supabase
      .from("water_logs")
      .select("amount_ml")
      .eq("user_id", userId)
      .eq("log_date", date || new Date().toISOString().slice(0, 10));

    if (error) throw error;

    const total = data.reduce((sum, item) => sum + Number(item.amount_ml), 0);

    return res.json({ success: true, total });

  } catch (error) {
    return res.status(500).json({ success: false });
  }
};