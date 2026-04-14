const express = require("express");
const router = express.Router();
const ownerController = require("../controllers/ownerController");
const authMiddleware = require("../middleware/authMiddleware");

// All Owner routes require authentication 
// In a full RBAC system, you might also have a strict role check middleware, 
// but authMiddleware provides req.user which we can verify against.
router.use(authMiddleware);

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Check if user is OWNER (dynamic lookup since JWT might be generated before role upgrade)
router.use(async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || user.role !== "OWNER") {
      return res.status(403).json({ error: "Access denied. Owner role required." });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: "Internal server error during authorization." });
  }
});

router.get("/dashboard", ownerController.getDashboardData);
router.get("/analytics", ownerController.getAnalytics);
router.get("/cars", ownerController.getOwnerCars);
router.get("/requests", ownerController.getOwnerRequests);
router.patch("/requests/:id", ownerController.updateRequestStatus);

router.get("/notifications", ownerController.getNotifications);
router.post("/notifications/read", ownerController.markNotificationsRead);

module.exports = router;
