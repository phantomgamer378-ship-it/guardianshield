const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const googleAuthController = require('../controllers/googleAuth.controller');
const { initiateGoogleAuth, handleGoogleCallback } = require('../middleware/googleAuth.middleware');

// ── Email / Password Auth ─────────────────────────────────────────────────────
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

// ── Google OAuth ──────────────────────────────────────────────────────────────
// Step 1: Redirect user to Google's consent screen
router.get('/google', initiateGoogleAuth);

// Step 2: Google redirects back here with an authorization code
router.get('/google/callback', handleGoogleCallback, googleAuthController.googleCallback);

module.exports = router;
