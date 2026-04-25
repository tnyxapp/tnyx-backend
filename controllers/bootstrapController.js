//controllers/bootstrapController.js

const {
  bootstrapService
} = require(
  "../services/bootstrapService"
);

exports.bootstrap =
  async (
    req,
    res
  ) => {
    try {
      const result =
        await bootstrapService(
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