const express = require('express');
const router = express.Router();
const videoController = require('../controllers/video.controller');
const requireAuth = require('../middleware/auth.middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Use disk storage so file.path is available for heuristic analysis
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname || '.bin'));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

router.post('/analyze', requireAuth, upload.single('video'), videoController.analyzeVideo);
router.post('/voice/analyze', requireAuth, upload.single('voice'), videoController.analyzeVoice);

module.exports = router;
