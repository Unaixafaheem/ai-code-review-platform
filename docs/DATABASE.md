# MongoDB Atlas Setup

## 1. Create cluster

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and sign up / log in
2. **Create** → Shared (free M0) cluster
3. Choose a cloud provider & region close to your Render backend
4. Cluster name: `ai-code-review`

## 2. Database access

1. **Database Access** → Add Database User
2. Username + strong password (save these)
3. Privileges: **Read and write to any database**

## 3. Network access

1. **Network Access** → Add IP Address
2. For development: `0.0.0.0/0` (allow from anywhere)
3. For production: add Render's outbound IP or use `0.0.0.0/0` on free tier

## 4. Connection string

1. **Database** → Connect → Drivers → Node.js
2. Copy the URI and replace `<password>` with your user password
3. Add to `backend/.env`:

```
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.xxxxx.mongodb.net/ai-code-review?retryWrites=true&w=majority
```

## Collections

Mongoose auto-creates these on first write:

| Collection | Model   | Purpose                          |
|------------|---------|----------------------------------|
| `users`    | User    | Auth — name, email, password     |
| `reviews`  | Review  | History — code, response, taskType |

## Indexes (auto-created by schema)

- `users.email` — unique
- `reviews.user + createdAt` — history queries
- `reviews.shareId` — sparse unique (public share links)
- `reviews.taskType` — filter by mode

## Review document highlights

- `response.annotations[]` — `{ line, severity, message, file? }` for Monaco markers
- `files[]` — multi-file / PR payloads `{ path, content, language }`
- `taskType` — includes `multifile`, `pr-review`, `github`, and the 7 core modes
- `shareId` — set via `POST /api/reviews/:id/share`

## Verify connection

```bash
cd backend
npm run dev
# Should log: MongoDB connected: cluster0.xxxxx.mongodb.net
```
