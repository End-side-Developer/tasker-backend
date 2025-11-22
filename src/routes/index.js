const express = require('express');
const router = express.Router();

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Tasker Backend is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * API info endpoint
 */
router.get('/info', (req, res) => {
  res.json({
    success: true,
    api: {
      name: 'Tasker Backend API',
      version: '1.0.0',
      description: 'Backend API for Tasker Zoho Cliq integration',
    },
    endpoints: {
      tasks: '/api/tasks',
      cliq: '/api/cliq',
      health: '/api/health',
    },
  });
});

module.exports = router;
