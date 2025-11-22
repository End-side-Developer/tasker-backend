const logger = require('../config/logger');
const { verifyAccessToken } = require('../config/jwt');

/**
 * Verify API key from request header
 */
const verifyApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: { message: 'API key is required' },
    });
  }

  if (apiKey !== process.env.API_SECRET_KEY) {
    logger.warn('Invalid API key attempt', { ip: req.ip });
    return res.status(403).json({
      success: false,
      error: { message: 'Invalid API key' },
    });
  }

  next();
};

/**
 * Verify JWT Bearer token from Authorization header
 */
const verifyJWT = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authorization token is required' },
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid or expired token' },
      });
    }

    // Attach user info to request
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('JWT verification error:', error);
    return res.status(401).json({
      success: false,
      error: { message: 'Token verification failed' },
    });
  }
};

/**
 * Verify either API key or JWT token (flexible authentication)
 */
const verifyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const authHeader = req.headers.authorization;

  // Try API key first
  if (apiKey) {
    if (apiKey === process.env.API_SECRET_KEY) {
      return next();
    } else {
      logger.warn('Invalid API key attempt', { ip: req.ip });
      return res.status(403).json({
        success: false,
        error: { message: 'Invalid API key' },
      });
    }
  }

  // Try JWT token
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);

    if (decoded) {
      req.user = decoded;
      return next();
    } else {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid or expired token' },
      });
    }
  }

  // No valid authentication provided
  return res.status(401).json({
    success: false,
    error: { message: 'Authentication required (API key or Bearer token)' },
  });
};

/**
 * Verify Cliq user mapping exists
 */
const verifyCliqUser = async (req, res, next) => {
  try {
    const cliqUserId = req.body.cliqContext?.userId;

    if (!cliqUserId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Cliq user ID is required' },
      });
    }

    // Add user verification logic here if needed
    req.cliqUserId = cliqUserId;
    next();
  } catch (error) {
    logger.error('User verification error:', error);
    next(error);
  }
};

module.exports = { verifyApiKey, verifyJWT, verifyAuth, verifyCliqUser };
