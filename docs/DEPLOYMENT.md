# Deployment Guide

## Architecture

| Service  | Platform       | Notes |
|----------|----------------|-------|
| Frontend | [Vercel](https://vercel.com) | Root: `client` |
| Backend  | [Render](https://render.com) | Root: `backend` (`render.yaml`) |
| Database | [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) | Free M0 is fine |

Optional later: Redis (cache/queues), Sentry, Judge0.

---

## Prerequisites (before deploy)

1. Code pushed to GitHub (`origin`)
2. MongoDB Atlas connection string
3. Groq API key from [console.groq.com](https://console.groq.com) (or OpenAI)

---

## Step 1 — MongoDB Atlas

See [DATABASE.md](./DATABASE.md).

1. Create free **M0** cluster
2. Database user + password
3. Network Access → allow `0.0.0.0/0` (or Render IPs)
4. Copy URI: `mongodb+srv://USER:PASSWORD@cluster.../ai-code-review?retryWrites=true&w=majority`

---

## Step 2 — Backend on Render

1. [render.com](https://render.com) → **New +** → **Blueprint** (uses `render.yaml`)  
   **or** **Web Service** → connect repo → Root Directory: `backend`
2. Build: `npm install` · Start: `node server.js`
3. Set env vars:

| Variable | Required | Value |
|----------|----------|-------|
| `MONGODB_URI` | Yes | Atlas connection string |
| `JWT_SECRET` | Yes | Long random string (Render can auto-generate) |
| `GROQ_API_KEY` | Yes* | From Groq console |
| `AI_PROVIDER` | Yes | `groq` (or `openai`) |
| `CLIENT_URL` | Yes | Your Vercel URL(s), comma-separated, no trailing slash |
| `OPENAI_API_KEY` | For Compare | Needed for model comparison |
| `GITHUB_TOKEN` | Optional | Higher GitHub API limits |
| `REDIS_URL` | Optional | Leave empty → in-memory cache/queues |
| `SENTRY_DSN` | Optional | Error tracking |
| `JUDGE0_API_KEY` | Optional | Real sandbox; else simulator |
| `FREE_DAILY_LIMIT` | Optional | Default `20` |

4. Deploy → copy URL, e.g. `https://ai-code-review-api.onrender.com`
5. Test: `curl https://YOUR-API.onrender.com/api/health`

> Free Render services sleep after ~15 min. First request can take 30–60s.

---

## Step 3 — Frontend on Vercel

1. [vercel.com](https://vercel.com) → **Add New Project** → import the same GitHub repo
2. **Root Directory:** `client`
3. Framework: **Vite** (auto-detected)
4. Environment variable:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://YOUR-API.onrender.com/api` |

5. Deploy → copy Vercel URL, e.g. `https://ai-code-review.vercel.app`

---

## Step 4 — Wire CORS

1. Render → Environment → set `CLIENT_URL` to your Vercel URL  
   Example: `https://ai-code-review.vercel.app`  
   (add `http://localhost:5173` too if you still develop locally)
2. Save → Render redeploys

---

## Verify

1. Open Vercel URL → **Register**
2. Submit a code review on Dashboard
3. Check **History** and **Usage**

```bash
curl https://YOUR-API.onrender.com/api/health
# {"status":"ok", ...}
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS error | `CLIENT_URL` must match Vercel origin exactly (https, no trailing `/`) |
| Mongo timeout | Atlas Network Access → `0.0.0.0/0` |
| AI 503 | `GROQ_API_KEY` / `OPENAI_API_KEY` missing on Render |
| Blank API after sleep | Wait ~30s for cold start, retry |
| Frontend 404 on refresh | `client/vercel.json` SPA rewrites (already included) |
| `VITE_API_URL` wrong | Must end with `/api` and use the Render hostname |

---

## Local development

```bash
cd backend && cp .env.example .env && npm install && npm run dev
cd client && npm install && npm run dev
```
