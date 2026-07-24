const morgan = require('morgan');
const { recordRequest, recordError } = require('../services/metricsService');

morgan.token('user-id', (req) => req.user?.id || '-');

const requestLogger = morgan(
  ':method :url :status :res[content-length] - :response-time ms user=:user-id'
);

function metricsMiddleware(req, res, next) {
  recordRequest();
  const start = Date.now();
  res.on('finish', () => {
    if (res.statusCode >= 500) recordError();
    req._durationMs = Date.now() - start;
  });
  next();
}

module.exports = { requestLogger, metricsMiddleware };
