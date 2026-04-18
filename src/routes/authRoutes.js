
const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");

router.post("/login", authController.login);
router.post("/register", authController.register);
router.post("/refresh", authController.refreshToken);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

const authMiddleware = require("../middleware/authMiddleware");
router.get("/me", authMiddleware, authController.getMe);

module.exports = router;