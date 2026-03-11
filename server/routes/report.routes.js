const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const phoneController = require('../controllers/phone.controller');
const requireAuth = require('../middleware/auth.middleware');

router.post('/nccp', requireAuth, reportController.submitToNCCP);
router.get('/list', requireAuth, reportController.getReports);

// Community report endpoint - used by the dashboard "Report a Scam" form
router.post('/community', requireAuth, phoneController.report);

module.exports = router;
