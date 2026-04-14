const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const bookingController = require("../controllers/bookingController");

router.post("/", authMiddleware, bookingController.createBooking);
router.get("/", authMiddleware, bookingController.getUserBookings);
router.delete("/:id", authMiddleware, bookingController.deleteBooking);
router.patch("/:id/approve", authMiddleware, bookingController.approveBooking);
router.patch("/:id/reject", authMiddleware, bookingController.rejectBooking);
router.post("/:id/pay", authMiddleware, bookingController.payBooking);

module.exports = router;