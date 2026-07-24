let Sentry = null;

function initSentry(app) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return null;

  try {
    Sentry = require('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
    });

    if (app && Sentry.setupExpressErrorHandler) {
      // v8+ style — error handler added later in server
    }
    console.log('[sentry] initialized');
    return Sentry;
  } catch (err) {
    console.warn('[sentry] failed to init:', err.message);
    return null;
  }
}

function captureException(err, context = {}) {
  if (Sentry) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
      Sentry.captureException(err);
    });
  }
}

function sentryErrorHandler() {
  if (Sentry?.setupExpressErrorHandler) {
    return (err, req, res, next) => {
      Sentry.setupExpressErrorHandler()(err, req, res, () => next(err));
    };
  }
  return (err, _req, _res, next) => next(err);
}

module.exports = { initSentry, captureException, sentryErrorHandler, getSentry: () => Sentry };
