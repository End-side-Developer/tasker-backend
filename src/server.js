const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const session = require('express-session');
const passport = require('passport');
const cron = require('node-cron');
require('dotenv').config();

const { initializeFirebase } = require('./config/firebase');
const { configureOAuth } = require('./config/oauth');
const logger = require('./config/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { verifyApiKey, verifyAuth } = require('./middleware/auth');
const { apiLimiter } = require('./middleware/rateLimiter');

// Import services
const firestoreListenerService = require('./services/firestoreListenerService');

// Import routes
const indexRoutes = require('./routes/index');
const taskRoutes = require('./routes/taskRoutes');
const cliqRoutes = require('./routes/cliqRoutes');
const botRoutes = require('./routes/botRoutes');
const authRoutes = require('./routes/authRoutes');
const testRoutes = require('./routes/testRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Behind Azure/App Service reverse proxy, trust X-Forwarded-* so req.ip is correct
app.set('trust proxy', 1);

// Initialize Firebase
try {
  initializeFirebase();
} catch (error) {
  logger.error('Failed to initialize Firebase:', error);
  process.exit(1);
}

// Initialize OAuth 2.0
try {
  configureOAuth();
} catch (error) {
  logger.error('Failed to configure OAuth:', error);
  process.exit(1);
}

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Session middleware (required for OAuth)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-session-secret-here',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
}

// Rate limiting
app.use('/api/', apiLimiter);

// Routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Tasker Backend API',
    version: '1.0.0',
    docs: '/api/info',
  });
});

app.use('/api', indexRoutes);
app.use('/api/auth', authRoutes); // OAuth routes (no auth required for login/callback)
app.use('/api/tasks', verifyAuth, taskRoutes); // Accepts API key OR JWT token
app.use('/api/cliq', verifyAuth, cliqRoutes); // Accepts API key OR JWT token
app.use('/api/cliq/bot', verifyAuth, botRoutes); // TaskerBot endpoints
app.use('/api/cliq/notifications', verifyAuth, notificationRoutes); // Notification settings
app.use('/api/test', testRoutes); // Test endpoints (mixed auth)

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 Tasker Backend running on port ${PORT}`);
  logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/api/health`);

  // Initialize Firestore listeners for real-time notifications
  try {
    firestoreListenerService.initialize();
  } catch (error) {
    logger.error('Failed to initialize Firestore listeners:', error);
  }

  // Setup scheduled tasks for notifications
  setupScheduledTasks();
});

// Setup scheduled notification checks
function setupScheduledTasks() {
  // Check for overdue tasks daily at 9 AM
  cron.schedule('0 9 * * *', async () => {
    logger.info('⏰ Running scheduled overdue task check...');
    await firestoreListenerService.checkOverdueTasks();
  });

  // Check for tasks due soon every hour
  cron.schedule('0 * * * *', async () => {
    logger.info('⏰ Running scheduled due-soon task check...');
    await firestoreListenerService.checkDueSoonTasks();
  });

  logger.info('📅 Scheduled notification tasks configured');
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  firestoreListenerService.shutdown();
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  firestoreListenerService.shutdown();
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;
