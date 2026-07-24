# GitHub App — PR Review Bot

The platform can auto-review pull requests when opened or updated.

## Option A — GitHub App (recommended for webhooks)

1. GitHub → **Settings** → **Developer settings** → **GitHub Apps** → **New GitHub App**
2. Permissions:
   - **Pull requests**: Read & write
   - **Contents**: Read-only
   - **Issues**: Read & write (for fallback comments)
3. Subscribe to events: **Pull request**
4. Webhook URL: `https://YOUR-RENDER-URL/api/webhooks/github`
5. Generate a webhook secret → `GITHUB_WEBHOOK_SECRET`
6. Generate a private key → paste into `GITHUB_PRIVATE_KEY` (escape newlines as `\n`)
7. Note **App ID** → `GITHUB_APP_ID`
8. Install the app on your repo; optionally set `GITHUB_INSTALLATION_ID`

## Option B — Personal access token (manual PR Bot page)

1. Create a classic PAT with `repo` scope
2. Set `GITHUB_TOKEN` in backend `.env`
3. Use the in-app **PR Bot** page to review a PR URL

## Events handled

| Event | Actions | Behavior |
|-------|---------|----------|
| `ping` | — | Returns pong |
| `pull_request` | `opened`, `synchronize`, `reopened` | Fetch changed files → AI review → post PR review comments |

## Manual API

```bash
curl -X POST https://YOUR-API/api/ai/pr-review \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://github.com/owner/repo/pull/1","post":true}'
```

Set `"post": false` for a dry run that still saves the review to history.
