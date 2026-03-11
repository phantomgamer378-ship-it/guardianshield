const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const requireAuth = require('../middleware/auth.middleware');

router.get('/profile', requireAuth, userController.getProfile);
router.get('/history', requireAuth, userController.getHistory);
router.put('/profile/password', requireAuth, userController.updatePassword);
router.put('/profile/avatar', requireAuth, userController.uploadAvatar);

module.exports = router;
