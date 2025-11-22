const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyJWT } = require('../middleware/auth');

/**
 * @route   GET /api/auth/login
 * @desc    Initiate OAuth 2.0 login flow
 * @access  Public
 */
router.get('/login', authController.login);

/**
 * @route   GET /api/auth/callback
 * @desc    OAuth 2.0 callback endpoint
 * @access  Public
 */
router.get('/callback', authController.callback);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh', authController.refresh);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private (requires JWT)
 */
router.get('/me', verifyJWT, authController.me);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (optional token blacklist)
 * @access  Private (requires JWT)
 */
router.post('/logout', verifyJWT, authController.logout);

module.exports = router;
