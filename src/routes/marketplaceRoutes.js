const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const marketplaceController = require("../controllers/marketplaceController");

// Booking flow actions
router.patch("/bookings/:id/complete", authMiddleware, marketplaceController.completeBooking);
router.post("/bookings/:id/cancel", authMiddleware, marketplaceController.cancelBooking);

// Cron simulation endpoints
router.post("/internal/settle-bookings", marketplaceController.settleBookings);
router.post("/internal/process-payouts", marketplaceController.processPayouts);

// Wallet and Payouts
router.get("/owners/:id/wallet", authMiddleware, marketplaceController.getOwnerWallet);
router.get("/owners/:id/payouts", authMiddleware, marketplaceController.getOwnerPayouts);

module.exports = router;
