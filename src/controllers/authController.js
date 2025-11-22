const logger = require('../config/logger');
const { generateTokenPair, verifyRefreshToken } = require('../config/jwt');
const passport = require('passport');

/**
 * Initiate OAuth login
 */
const login = passport.authenticate('oauth2');

/**
 * Handle OAuth callback
 */
const callback = (req, res, next) => {
  passport.authenticate('oauth2', { session: false }, (err, user, info) => {
    if (err) {
      logger.error('OAuth callback error:', err);
      // Return JSON error for testing without frontend
      return res.status(500).json({
        success: false,
        error: { message: 'Authentication failed' },
        details: err.message,
      });
    }

    if (!user) {
      logger.warn('OAuth callback - no user', info);
      return res.status(401).json({
        success: false,
        error: { message: 'User not found' },
        info,
      });
    }

    try {
      // Generate JWT tokens
      const tokens = generateTokenPair(user);

      logger.info('OAuth login successful', { userId: user.id, email: user.email });

      // Check if frontend URL is configured
      const frontendUrl = process.env.FRONTEND_URL;
      
      // If no frontend or format=json requested, return JSON
      if (!frontendUrl || frontendUrl === 'http://localhost:3000' || req.query.format === 'json') {
        return res.json({
          success: true,
          message: 'Authentication successful! 🎉',
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            firstName: user.firstName,
            lastName: user.lastName,
          },
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
          },
          instructions: {
            step1: 'Copy the accessToken above',
            step2: 'Use it in Authorization header: Bearer <accessToken>',
            step3: 'Test with: GET /api/auth/me',
            step4: 'Refresh when expired: POST /api/auth/refresh with refreshToken',
          }
        });
      }

      // Redirect to frontend with tokens in URL (for web flow)
      const redirectUrl = `${frontendUrl}/auth/success?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;
      res.redirect(redirectUrl);
    } catch (error) {
      logger.error('Token generation error:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Token generation failed' },
        details: error.message,
      });
    }
  })(req, res, next);
};

/**
 * Refresh access token using refresh token
 */
const refresh = (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: { message: 'Refresh token is required' },
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid or expired refresh token' },
      });
    }

    // Generate new token pair
    const tokens = generateTokenPair({
      id: decoded.id,
      email: decoded.email,
    });

    logger.info('Token refreshed successfully', { userId: decoded.id });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      tokens,
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Token refresh failed' },
    });
  }
};

/**
 * Get current authenticated user info
 */
const me = (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Not authenticated' },
      });
    }

    res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        provider: req.user.provider,
      },
    });
  } catch (error) {
    logger.error('Get user info error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get user info' },
    });
  }
};

/**
 * Logout (client-side token removal, server can add token blacklist here)
 */
const logout = (req, res) => {
  try {
    // Note: With JWT, logout is typically handled client-side by removing tokens
    // You can implement token blacklisting here if needed

    logger.info('User logged out', { userId: req.user?.id });

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Logout failed' },
    });
  }
};

module.exports = {
  login,
  callback,
  refresh,
  me,
  logout,
};
