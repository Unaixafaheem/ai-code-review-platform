# AI Code Review Platform

Full-stack AI code review SaaS with Redis caching, BullMQ jobs, Sentry, CI/CD, secret scanning, sandbox execution, and audit logs.

## Architecture

| Layer | Stack |
|-------|-------|
| **Frontend** | React (Vite) + Tailwind + Monaco → **Vercel** |
| **Backend** | Node.js + Express → **Render** |
| **Database** | MongoDB Atlas |
| **Cache / Queue** | Redis + BullMQ (memory fallback) |
| **AI** | OpenAI / Groq |
| **Observability** | Morgan + `/api/metrics` + Sentry |
| **CI** | GitHub Actions (Jest, Vitest, Playwright) |

## Quick Start

```bash
cd backend && cp .env.example .env && npm install && npm run dev
cd client && npm install && npm run dev
```

Optional: `REDIS_URL`, `SENTRY_DSN`, `JUDGE0_API_KEY` — see [docs/INFRA.md](docs/INFRA.md).

## Tests

```bash
cd backend && npm test
cd client && npm test && npm run build && npm run test:e2e
```

## License

ISC
