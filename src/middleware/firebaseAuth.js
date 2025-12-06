const { admin } = require('../config/firebase');
const logger = require('../config/logger');

/**
 * Verify Firebase ID token from Authorization header
 * This middleware validates Firebase Auth tokens from Flutter app
 */
const verifyFirebaseAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header with Bearer token is required',
      });
    }

    const idToken = authHeader.split('Bearer ')[1];

    if (!idToken) {
      return res.status(401).json({
        success: false,
        error: 'ID token is required',
      });
    }

    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
    };

    logger.info(`Firebase Auth verified for user: ${decodedToken.uid}`);
    next();
  } catch (error) {
    logger.error('Firebase Auth verification error:', error.message);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        error: 'Token expired. Please refresh your token.',
      });
    }
    
    if (error.code === 'auth/argument-error') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token format',
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

module.exports = { verifyFirebaseAuth };
