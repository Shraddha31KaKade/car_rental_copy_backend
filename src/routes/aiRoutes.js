const express = require("express");
const aiController = require("../controllers/aiController");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/multerConfig"); 

const router = express.Router();

router.post("/chat", aiController.chat);
router.post("/recommend", aiController.recommend);
router.post("/extract-document", upload.single("document"), aiController.extractDocument);

module.exports = router;
