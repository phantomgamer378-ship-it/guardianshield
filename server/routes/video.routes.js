const express = require('express');
const router = express.Router();
const videoController = require('../controllers/video.controller');
const requireAuth = require('../middleware/auth.middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Detect Lambda/Netlify environment — no writable disk available
const isLambda = !!(process.env.LAMBDA_TASK_ROOT || process.env.NETLIFY);

let storage;
if (isLambda) {
    // Memory storage: file is available as file.buffer (no disk writes)
    storage = multer.memoryStorage();
} else {
    // Disk storage for local development: file is available as file.path
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    storage = multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => {
            const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, unique + path.extname(file.originalname || '.bin'));
        }
    });
}

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

router.post('/analyze', requireAuth, upload.single('video'), videoController.analyzeVideo);
router.post('/voice/analyze', requireAuth, upload.single('voice'), videoController.analyzeVoice);

module.exports = router;
