const express = require('express');
const router = express.Router();
const videoController = require('../controllers/video.controller');
const requireAuth = require('../middleware/auth.middleware');
const multer = require('multer');

const upload = multer({ dest: 'uploads/' });

router.post('/analyze', requireAuth, upload.single('video'), videoController.analyzeVideo);
router.post('/voice/analyze', requireAuth, upload.single('voice'), videoController.analyzeVoice);

module.exports = router;
