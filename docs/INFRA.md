# Engineering & Infrastructure

## Redis caching + BullMQ queues

Set `REDIS_URL=redis://localhost:6379` (or a managed Redis URL).

| Feature | Behavior without Redis | With Redis |
|---------|------------------------|------------|
| AI result cache | In-memory Map (process-local) | Shared TTL cache |
| GitHub / multifile jobs | Inline async (`mem_*` job ids) | BullMQ worker |

Endpoints:
- `POST /api/ai/github/queue` → `{ jobId }` then `GET /api/jobs/:id`
- `POST /api/ai/multifile/queue`

## Observability

- Morgan request logs
- `GET /api/metrics` — requests, errors, AI latency, cache hits
- `GET /api/health` — includes redis + metrics snapshot
- Set `SENTRY_DSN` for Sentry error capture

## Secret scanning

Before AI calls, `secretScanMiddleware` blocks known key patterns unless:
- `redactSecrets: true`, or
- `acknowledgeSecrets: true`

`POST /api/ai/scan-secrets` returns findings + redacted code.

## Sandbox execution

`POST /api/ai/execute` → Judge0 (RapidAPI) or local console.log simulator.

## Audit log

`GET /api/audit` — who ran what (analyze, sandbox, jobs, team actions).

## CI/CD

`.github/workflows/ci.yml` — backend Jest, frontend lint/Vitest/build, Playwright smoke.
`.github/workflows/deploy-preview.yml` — PR comment with Vercel/Render preview guidance.

## Tests

```bash
cd backend && npm test
cd client && npm test && npm run test:e2e
```
