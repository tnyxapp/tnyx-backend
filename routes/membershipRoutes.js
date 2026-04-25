// routes/membershipRoutes.js

const express =
  require("express");

const router =
  express.Router();

const authMiddleware =
  require("../middlewares/authMiddleware");

const membershipController =
  require("../controllers/membershipController");

router.get(
  "/",
  authMiddleware,
  membershipController.getMembership
);

router.post(
  "/purchase",
  authMiddleware,
  membershipController.purchaseMembership
);

module.exports =
  router;