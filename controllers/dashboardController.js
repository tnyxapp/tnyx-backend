// controllers/dashboardController.js

const {
  dashboardService
} = require(
  "../services/dashboardService"
);

exports.dashboard =
  async (
    req,
    res
  ) => {
    try {
      const result =
        await dashboardService(
          req.user.id
        );

      return res
        .status(200)
        .json(result);
    } catch (error) {
      return res
        .status(
          error.statusCode ||
          500
        )
        .json({
          success: false,
          message:
            error.message
        });
    }
  };