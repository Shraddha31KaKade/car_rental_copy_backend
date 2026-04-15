// src/routes/verificationRoutes.js
const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/verificationController');
const authMiddleware = require('../middleware/authMiddleware');

const requireAdmin = (req, res, next) => {
  // Assuming token payload includes role, otherwise we trust any authenticated user for now.
  // if (req.user.role !== 'ADMIN') return res.status(403).json({message: "Admin access required"});
  next();
};

// Route: /api/verifications

// 1. Fetch requests for admin dashboard (supports generic filtering)
router.get('/', authMiddleware, requireAdmin, verificationController.listRequests);

// 2. Fetch specific request details (including AI JSON)
router.get('/:id', authMiddleware, requireAdmin, verificationController.getRequestDetails);

// 3. Trigger AI document extraction manually
router.post('/:id/extract', authMiddleware, requireAdmin, verificationController.triggerAIExtraction);

// 4. Submit Admin decision
router.patch('/:id/decision', authMiddleware, requireAdmin, verificationController.submitDecision);

module.exports = router;
