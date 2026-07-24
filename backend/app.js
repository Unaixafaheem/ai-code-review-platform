require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { initSentry, captureException } = require('./config/sentry');
const { requestLogger, metricsMiddleware } = require('./middleware/logging');
const { getMetricsSnapshot } = require('./services/metricsService');
const { isRedisEnabled, isRedisReady } = require('./config/redis');
const { startWorker } = require('./services/queueService');

const authRoutes = require('./routes/authRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const aiRoutes = require('./routes/aiRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const teamRoutes = require('./routes/teamRoutes');
const ruleRoutes = require('./routes/ruleRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const jobRoutes = require('./routes/jobRoutes');
const auditRoutes = require('./routes/auditRoutes');

function createApp({ connect = true } = {}) {
  const app = express();

  initSentry(app);
  if (connect && process.env.NODE_ENV !== 'test') {
    connectDB();
    startWorker();
  }

  app.use(cors({
    origin: (process.env.CLIENT_URL || 'http://localhost:5173').split(','),
    credentials: true,
  }));

  app.use(
    '/api/webhooks',
    express.raw({ type: 'application/json' }),
    (req, _res, next) => {
      req.rawBody = req.body;
      next();
    },
    webhookRoutes
  );

  app.use(express.json({ limit: '5mb' }));
  app.use(metricsMiddleware);
  if (process.env.NODE_ENV !== 'test') {
    app.use(requestLogger);
  }

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      message: 'AI Code Review Platform API',
      redis: { enabled: isRedisEnabled(), ready: isRedisReady() },
      metrics: getMetricsSnapshot(),
    });
  });

  app.get('/api/metrics', (_req, res) => {
    res.json(getMetricsSnapshot());
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/teams', teamRoutes);
  app.use('/api/rules', ruleRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/jobs', jobRoutes);
  app.use('/api/audit', auditRoutes);

  app.use((err, _req, res, _next) => {
    captureException(err);
    console.error('Unhandled error:', err.message);
    res.status(err.status || 500).json({ message: err.message || 'Server error' });
  });

  app.use((_req, res) => {
    res.status(404).json({ message: 'Route not found' });
  });

  return app;
}

module.exports = { createApp };
