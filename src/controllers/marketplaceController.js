const marketplaceService = require("../services/marketplaceService");

exports.completeBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await marketplaceService.completeBooking(Number(id), req.user.id);
    res.json({ message: "Booking completed and dispute window started", booking });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { initiator } = req.body; // "GUEST", "OWNER", "NO_SHOW"
    if (!["GUEST", "OWNER", "NO_SHOW"].includes(initiator)) {
      return res.status(400).json({ error: "Invalid initiator" });
    }
    const booking = await marketplaceService.cancelBooking(Number(id), initiator, req.user.id);
    res.json({ message: "Booking cancelled according to policy", booking });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.settleBookings = async (req, res) => {
  try {
    const result = await marketplaceService.settleExpiredBookings();
    res.json({ message: "Settlement cron executed", result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.processPayouts = async (req, res) => {
  try {
    const result = await marketplaceService.processQueuedPayouts();
    res.json({ message: "Payout cron executed", result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOwnerWallet = async (req, res) => {
  try {
    const { id } = req.params;
    if (Number(id) !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Unauthorized" });
    }
    const wallet = await marketplaceService.getWalletWithTransactions(id);
    res.json({ wallet });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOwnerPayouts = async (req, res) => {
  try {
    const { id } = req.params;
    if (Number(id) !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Unauthorized" });
    }
    const payouts = await marketplaceService.getPayoutHistory(id);
    res.json({ payouts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
