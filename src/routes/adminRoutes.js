const express = require('express');
const router = express.Router();

const { listReports, getReportDetails, updateReportStatus, triggerReportAI } = require('../controllers/reportController');
const { listVerifications, getVerificationDetails, updateVerificationStatus, triggerVerificationAI } = require('../controllers/adminVerificationController');
const authMiddleware = require('../middleware/authMiddleware');

const { listPendingCars, getCarDetailsForReview, reviewListing, analyzeCarRC } = require('../controllers/adminCarController');

router.get('/reports', authMiddleware, listReports);
router.get('/reports/:id', authMiddleware, getReportDetails);
router.patch('/reports/:id/status', authMiddleware, updateReportStatus);
router.post('/reports/:id/analyze', authMiddleware, triggerReportAI);

router.get('/verifications', authMiddleware, listVerifications);
router.get('/verifications/:id', authMiddleware, getVerificationDetails);
router.patch('/verifications/:id/decision', authMiddleware, updateVerificationStatus);
router.post('/verifications/:id/analyze', authMiddleware, triggerVerificationAI);

router.get('/cars/pending', authMiddleware, listPendingCars);
router.get('/cars/:id', authMiddleware, getCarDetailsForReview);
router.patch('/cars/:id/decision', authMiddleware, reviewListing);
router.post('/cars/:id/analyze-rc', authMiddleware, analyzeCarRC);

module.exports = router;
