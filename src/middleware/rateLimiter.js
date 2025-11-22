const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    error: { message: 'Too many requests, please try again later' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for task creation
 */
const taskCreationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 task creations per minute
  message: {
    success: false,
    error: { message: 'Too many task creations, please slow down' },
  },
});

module.exports = { apiLimiter, taskCreationLimiter };
