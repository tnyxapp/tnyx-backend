const express = require("express");
const router = express.Router();

const authMiddleware =
  require("../middlewares/authMiddleware");

const bootstrapController =
  require("../controllers/bootstrapController");

router.get("/", authMiddleware, bootstrapController.bootstrap);

module.exports = router;