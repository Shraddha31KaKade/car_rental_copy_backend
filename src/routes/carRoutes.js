// const express = require("express");
// const router = express.Router();
// const controller = require("../controllers/carController");

// router.get("/", controller.getCars);
// router.post("/", controller.createCar);

// module.exports = router;









const express = require("express");
const router = express.Router();
const carController = require("../controllers/carController");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/multerConfig");

router.get("/", carController.getAllCars);
router.get("/:id/availability", carController.getCarAvailability);
router.get("/:id", carController.getCarById);
router.post("/", authMiddleware, upload.single("image"), carController.createCar);

module.exports = router;