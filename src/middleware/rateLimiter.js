const rateLimit = require('express-rate-limit');

// Extract client IP and normalize by removing port when present (e.g., "1.2.3.4:5678" -> "1.2.3.4")
const getClientIp = (req) => {
  // Prefer Express-parsed IP (honors trust proxy)
  let ip = req.ip || '';

  // Fallback to X-Forwarded-For if missing
  if (!ip && req.headers && req.headers['x-forwarded-for']) {
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string') {
      ip = xff.split(',')[0].trim();
    }
  }

  // Fallback to raw remote address
  if (!ip && req.connection && req.connection.remoteAddress) {
    ip = req.connection.remoteAddress;
  } else if (!ip && req.socket && req.socket.remoteAddress) {
    ip = req.socket.remoteAddress;
  }

  if (!ip) return 'unknown';

  // Handle IPv6-embedded IPv4 ("::ffff:1.2.3.4")
  if (ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }

  // Strip trailing port if present (common on Azure reverse proxy: "ip:port")
  const portMatch = ip.match(/^(.*):(\d+)$/);
  if (portMatch && portMatch[1]) {
    // Only strip if this looks like IPv4-with-port to avoid mangling IPv6 literals
    const candidate = portMatch[1];
    const lastSegment = candidate.split(':').pop();
    if (candidate.includes('.') || (lastSegment && lastSegment.includes('.'))) {
      ip = candidate;
    }
  }

  return ip;
};

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
  keyGenerator: (req) => getClientIp(req),
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
  keyGenerator: (req) => getClientIp(req),
});

module.exports = { apiLimiter, taskCreationLimiter };
