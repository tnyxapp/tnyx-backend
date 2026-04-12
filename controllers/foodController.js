//controllers/foodController.js
const supabase = require("../config/supabase");

// ➕ Add food log
exports.addFoodLog = async (req, res) => {
  try {
    const userId = req.user.id;
    const data = req.body;

    const { error } = await supabase
      .from("food_logs")
      .insert([{ ...data, user_id: userId }]);

    if (error) throw error;

    return res.status(201).json({
      success: true,
      message: "Food log added"
    });

  } catch (error) {
    console.error("Food Log Error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to add food log" });
  }
};

// 📊 Get daily logs
exports.getDailyFoodLogs = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.query;

    const { data, error } = await supabase
      .from("food_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("log_date", date || new Date().toISOString().slice(0, 10));

    if (error) throw error;

    return res.json({ success: true, data });

  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch logs" });
  }
};

// ❌ Delete log
exports.deleteFoodLog = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("food_logs")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return res.json({ success: true, message: "Deleted successfully" });

  } catch (error) {
    return res.status(500).json({ success: false, message: "Delete failed" });
  }
};