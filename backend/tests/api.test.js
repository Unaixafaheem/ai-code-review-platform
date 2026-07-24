const request = require('supertest');
const express = require('express');
const { createApp } = require('../app');
const { secretScanMiddleware } = require('../services/secretScanner');

describe('API health', () => {
  const app = createApp({ connect: false });

  test('GET /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.metrics).toBeDefined();
  });

  test('GET /api/metrics', async () => {
    const res = await request(app).get('/api/metrics');
    expect(res.status).toBe(200);
    expect(typeof res.body.requests).toBe('number');
  });

  test('rejects unauthorized reviews', async () => {
    const res = await request(app).get('/api/reviews');
    expect(res.status).toBe(401);
  });
});

describe('secretScanMiddleware', () => {
  const app = express();
  app.use(express.json());
  app.post('/t', secretScanMiddleware, (_req, res) => res.json({ ok: true }));

  test('blocks secrets', async () => {
    const res = await request(app)
      .post('/t')
      .send({ code: 'const k = "sk-abcdefghijklmnopqrstuvwxyz123456";' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('SECRETS_DETECTED');
  });

  test('allows redactSecrets', async () => {
    const res = await request(app)
      .post('/t')
      .send({
        code: 'const k = "sk-abcdefghijklmnopqrstuvwxyz123456";',
        redactSecrets: true,
      });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('allows acknowledgeSecrets', async () => {
    const res = await request(app)
      .post('/t')
      .send({
        code: 'const k = "sk-abcdefghijklmnopqrstuvwxyz123456";',
        acknowledgeSecrets: true,
      });
    expect(res.status).toBe(200);
  });

  test('passes clean code', async () => {
    const res = await request(app)
      .post('/t')
      .send({ code: 'function add(a,b){return a+b}' });
    expect(res.status).toBe(200);
  });
});
