process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-ci';
process.env.FREE_DAILY_LIMIT = '100';
// Avoid Redis/BullMQ in unit tests
delete process.env.REDIS_URL;
delete process.env.SENTRY_DSN;
