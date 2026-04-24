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

const cpUpload = upload.fields([
  { name: 'images', maxCount: 5 },
  { name: 'image', maxCount: 1 }, // legacy support
  { name: 'rcDocument', maxCount: 1 }
]);

router.post("/", authMiddleware, cpUpload, carController.createCar);
router.put("/:id", authMiddleware, cpUpload, carController.updateCar);
router.patch("/:id/pause", authMiddleware, carController.pauseCar);
router.delete("/:id", authMiddleware, carController.deleteCar);

module.exports = router;