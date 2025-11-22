require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

/**
 * Generate access token
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      provider: user.provider || 'oauth2',
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
};

/**
 * Verify access token
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Generate token pair (access + refresh)
 */
const generateTokenPair = (user) => {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
    expiresIn: JWT_EXPIRES_IN,
  };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateTokenPair,
};
