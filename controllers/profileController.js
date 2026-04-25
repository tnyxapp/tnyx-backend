// controllers/profileController.js

const {
  getProfile,
  updateProfile
} = require("../services/profileService");

exports.getProfile = async (req, res) => {
  try {
    const result = await getProfile(req.user.id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const result = await updateProfile(
      req.user.id,
      req.body
    );

    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};