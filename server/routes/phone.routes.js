const express = require('express');
const router = express.Router();
const phoneController = require('../controllers/phone.controller');
const requireAuth = require('../middleware/auth.middleware');

router.post('/analyze', requireAuth, phoneController.analyze);
router.post('/report', requireAuth, phoneController.report);
router.post('/sync-spam-db', requireAuth, phoneController.syncSpamDb);
router.post('/caller-id', requireAuth, phoneController.fetchCallerInfo);

module.exports = router;
