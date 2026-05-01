# Deploy Orchestrator — Backend

Production-grade Node.js backend for orchestrating multi-repo GitHub deployments.

## Stack

| Layer          | Technology                 |
| -------------- | -------------------------- |
| HTTP server    | Express 4                  |
| Database       | SQLite (better-sqlite3)    |
| Queue          | Bull (Redis-backed)        |
| Auth           | passport-github2 (OAuth 2) |
| Git operations | simple-git                 |
| Logging        | Winston (structured JSON)  |
| Validation     | Joi                        |
| Locking        | Redis SET NX EX            |

---

## Project structure

```
src/
├── config/         # env validation, logger, db, redis, passport, migrations
├── repositories/   # data-access layer (UserRepo, ProjectRepo, RepoRepo, DeployLogRepo)
├── services/       # business logic (ProjectService, DeployService, LockService)
├── controllers/    # HTTP request/response handlers
├── routes/         # Express routers (auth, projects, jobs)
├── middlewares/    # requireAuth, asyncHandler, correlationId, errorHandler, requestLogger
├── queues/         # Bull queue definition
├── workers/        # deployWorker.js (standalone process)
├── utils/          # errors.js, gitHelper.js, correlationStorage.js
├── app.js          # Express app composition root
└── server.js       # HTTP server entry point
```

---

## Prerequisites

- Node.js >= 20
- Redis 7 (via Docker or local install)
- A GitHub OAuth App with callback URL set to `http://localhost:3000/auth/github/callback`
- `git` installed on the machine running the worker

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

| Variable                    | Description                                                        |
| --------------------------- | ------------------------------------------------------------------ |
| `SESSION_SECRET`            | Long random string (e.g. `openssl rand -hex 32`)                   |
| `GITHUB_CLIENT_ID`          | From your GitHub OAuth App                                         |
| `GITHUB_CLIENT_SECRET`      | From your GitHub OAuth App                                         |
| `GITHUB_CALLBACK_URL`       | Must match what's registered in GitHub                             |
| `REDIS_HOST` / `REDIS_PORT` | Redis connection                                                   |
| `DB_PATH`                   | Path to the SQLite file (default: `./data/deploy_orchestrator.db`) |
| `REPOS_BASE_DIR`            | Where repos will be cloned (default: `./data/repos`)               |
| `LOG_LEVEL`                 | `debug` / `info` / `warn` / `error`                                |

### 3. Start Redis

```bash
docker compose up -d redis
```

### 4. Run database migrations

Creates all tables (idempotent — safe to run multiple times):

```bash
npm run migrate
```

### 5. Start the API server

```bash
npm start
# or in watch mode during development:
npm run dev
```

### 6. Start the deploy worker (separate terminal)

```bash
npm run worker
# or in watch mode:
npm run dev:worker
```

---

## API

### Authentication

| Method | Path                    | Description        |
| ------ | ----------------------- | ------------------ |
| `GET`  | `/auth/github`          | Redirect to GitHub |
| `GET`  | `/auth/github/callback` | OAuth callback     |
| `POST` | `/auth/logout`          | Destroy session    |
| `GET`  | `/auth/me`              | Current user info  |

### Projects

| Method | Path                        | Description        |
| ------ | --------------------------- | ------------------ |
| `GET`  | `/api/projects`             | List projects      |
| `POST` | `/api/projects`             | Create project     |
| `GET`  | `/api/projects/:id/repos`   | List repos         |
| `POST` | `/api/projects/:id/repos`   | Add repo           |
| `POST` | `/api/projects/:id/deploy`  | Enqueue deployment |
| `GET`  | `/api/projects/:id/deploys` | Deployment history |

### Jobs

| Method | Path               | Description     |
| ------ | ------------------ | --------------- |
| `GET`  | `/api/jobs/:jobId` | Poll job status |

All `/api/*` routes require an authenticated session (cookie `connect.sid`).

### Swagger UI

Available at **`http://localhost:3000/api-docs`** when the server is running.

---

## Deployment flow

1. `POST /api/projects/:id/deploy` creates a `deploy_logs` record with status `queued` and adds a Bull job.
2. The worker picks up the job, sets status to `running`, then iterates repos in `order_index` order.
3. For each repo:
   - Acquires a Redis lock (prevents concurrent operations on the same local clone).
   - Clones (first run) or fetches (subsequent runs) using the authenticated user's token.
   - Checks out `production`, merges `origin/main` with `--no-ff`, pushes.
   - Releases the lock.
4. On merge conflict the merge is aborted, the repo is marked as failed.
   - `atomic = false` (default): remaining repos still deploy.
   - `atomic = true`: deployment stops immediately.
5. Final status is written to `deploy_logs`: `success`, `failed`, or `conflict`.

---

## RBAC

- A user can only see and deploy projects they **own** or are a **member** of.
- Membership is managed via the `project_members` table.
- Owner role is stored on the `projects.owner_id` column.

---

## Testing

Unit tests should mock repositories and services. Suggested test structure:

```
tests/
├── unit/
│   ├── services/ProjectService.test.js
│   ├── services/DeployService.test.js
│   └── utils/gitHelper.test.js
└── integration/
    └── routes/projects.test.js   # supertest against the Express app
```

Run with your preferred test runner (e.g. `vitest` or `jest`).

---

## Security notes

- Tokens are stored in SQLite — encrypt the DB file in production or use a secrets manager.
- The `access_token` column is **never** returned by the API endpoints.
- All routes behind `/api/` are rate-limited (200 req / 15 min).
- Helmet sets secure HTTP headers.
- CORS is locked to `ALLOWED_ORIGINS` in production.
