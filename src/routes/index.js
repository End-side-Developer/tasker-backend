const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const taskRoutes = require('./taskRoutes');
const cliqRoutes = require('./cliqRoutes');
const cliqCommandRoutes = require('./cliqCommandRoutes');
const testRoutes = require('./testRoutes');

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
      auth: '/api/auth',
      tasks: '/api/tasks',
      cliq: '/api/cliq',
      commands: '/api/cliq/commands',
      test: '/api/test',
      health: '/api/health',
    },
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/tasks', taskRoutes);
router.use('/cliq/commands', cliqCommandRoutes);
router.use('/cliq', cliqRoutes);
router.use('/test', testRoutes);

module.exports = router;
