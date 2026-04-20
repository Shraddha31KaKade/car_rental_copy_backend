const express = require("express");
const aiController = require("../controllers/aiController");
const chatbotController = require("../controllers/chatbotController");
const upload = require("../middleware/multerConfig"); 
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/chat", authMiddleware, chatbotController.handleChat);
router.post("/recommend", aiController.recommend);
router.post("/extract-document", upload.single("document"), aiController.extractDocument);

module.exports = router;
