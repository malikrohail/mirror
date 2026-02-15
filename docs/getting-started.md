# Getting Started with Mirror

This guide walks you through setting up the Mirror development environment on your local machine.

---

## Prerequisites

Make sure the following are installed before proceeding.

| Tool | Minimum Version | How to Check | Install |
|------|----------------|--------------|---------|
| Node.js | 20+ | `node --version` | [nodejs.org](https://nodejs.org/) or `brew install node` |
| npm | 10+ | `npm --version` | Included with Node.js |
| Python | 3.12+ | `python3 --version` | [python.org](https://www.python.org/) or `brew install python@3.12` |
| Docker & Docker Compose | Docker 24+, Compose 2+ | `docker --version` | [docker.com](https://www.docker.com/products/docker-desktop/) |
| Git | 2.x | `git --version` | `brew install git` |

PostgreSQL and Redis run inside Docker containers -- you do not need to install them directly on your host machine.

---

## Quick Start

The fastest path from zero to a running local environment.

```bash
# 1. Clone the repository
git clone <repo-url> mirror
cd mirror

# 2. Copy the environment file and add your API keys
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY (required)

# 3. Start PostgreSQL and Redis
docker compose up -d postgres redis

# 4. Set up the backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
playwright install chromium

# 5. Run database migrations
alembic upgrade head

# 6. Start the backend API server
uvicorn app.main:app --reload --port 8000

# 7. In a new terminal, start the arq worker
cd backend
source .venv/bin/activate
arq app.workers.settings.WorkerSettings

# 8. In a new terminal, start the frontend
cd frontend
npm install
npx next dev
```

The frontend will be available at **http://localhost:3000** and the backend API at **http://localhost:8000**.

Alternatively, run everything at once with:

```bash
make dev-all
```

---

## Environment Variables

Create a `.env` file in the project root. The table below lists all supported variables.

### Essential

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude models. Obtain from [console.anthropic.com](https://console.anthropic.com/) |
| `DATABASE_URL` | Yes | PostgreSQL async connection string. Default: `postgresql+asyncpg://mirror:mirror@localhost:5432/mirror` |
| `REDIS_URL` | Yes | Redis connection string. Default: `redis://localhost:6379/0` |
| `BROWSERBASE_API_KEY` | For cloud browsers | Browserbase API key for cloud-hosted Playwright browsers |
| `BROWSERBASE_PROJECT_ID` | For cloud browsers | Browserbase project identifier |

### Optional -- Integrations

| Variable | Required | Description |
|----------|----------|-------------|
| `FIRECRAWL_API_KEY` | No | Firecrawl key for site pre-crawling (sitemap discovery) |
| `R2_ACCESS_KEY_ID` | No | Cloudflare R2 access key for screenshot storage |
| `R2_SECRET_ACCESS_KEY` | No | Cloudflare R2 secret key |
| `R2_BUCKET_NAME` | No | R2 bucket name (default: `mirror-screenshots`) |
| `R2_ENDPOINT_URL` | No | R2 endpoint URL |
| `CLERK_SECRET_KEY` | No | Clerk secret key for authentication |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | No | Clerk publishable key (frontend) |
| `LANGFUSE_PUBLIC_KEY` | No | Langfuse public key for LLM observability |
| `LANGFUSE_SECRET_KEY` | No | Langfuse secret key |
| `LANGFUSE_HOST` | No | Langfuse host URL (default: `https://cloud.langfuse.com`) |
| `SENTRY_DSN` | No | Sentry DSN for error monitoring |
| `RESEND_API_KEY` | No | Resend key for transactional email |

### Optional -- Application Config

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPUS_MODEL` | No | `claude-opus-4-6` | Primary Claude model for deep analysis |
| `SONNET_MODEL` | No | `claude-sonnet-4-5-20250929` | Faster model for navigation decisions |
| `MAX_CONCURRENT_SESSIONS` | No | `5` | Max parallel browser sessions per study |
| `MAX_STEPS_PER_SESSION` | No | `30` | Max navigation steps per persona session |
| `STUDY_TIMEOUT_SECONDS` | No | `600` | Overall study timeout (10 minutes) |
| `STORAGE_PATH` | No | `./data` | Local filesystem path for screenshots and reports |
| `LOG_LEVEL` | No | `INFO` | Logging level (`DEBUG`, `INFO`, `WARNING`, `ERROR`) |

---

## Running Services Individually

### Infrastructure (PostgreSQL + Redis)

```bash
# Start
docker compose up -d postgres redis

# Stop
docker compose down

# Check status
docker compose ps
```

PostgreSQL runs on port **5432** (user: `mirror`, password: `mirror`, database: `mirror`).
Redis runs on port **6379**.

### Backend API

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

The API server runs on **http://localhost:8000** with auto-reload enabled.

### Worker (Background Jobs)

The arq worker processes study runs, browser sessions, and analysis jobs. Run it in a separate terminal.

```bash
cd backend
source .venv/bin/activate
arq app.workers.settings.WorkerSettings
```

For development with auto-reload on code changes:

```bash
make dev-worker
```

### Frontend

```bash
cd frontend
npm install
npx next dev
```

The frontend runs on **http://localhost:3000**. It proxies all `/api/v1/*` requests to the backend on port 8000 via the `next.config.ts` rewrite rules -- no CORS configuration needed during development.

### Database Migrations

```bash
# Apply all pending migrations
cd backend
source .venv/bin/activate
alembic upgrade head

# Create a new migration after changing models
alembic revision --autogenerate -m "describe the change"
```

Or use the Makefile shortcuts:

```bash
make migrate                        # Apply migrations
make migrate-create msg="add foo"   # Create new migration
```

### Seed Data

To populate the database with pre-built persona templates:

```bash
make seed
```

---

## Running with Docker Compose

### Standard Mode (Backend + Worker + Frontend)

```bash
docker compose up --build
```

This starts all services: PostgreSQL, Redis, backend API, arq worker, and frontend. The frontend is accessible at **http://localhost:3000**.

### Local Playwright Mode (No Browserbase)

If you do not have Browserbase credentials and want to run Playwright browsers locally:

```bash
docker compose --profile local up --build
```

This mode starts dedicated containers with embedded Chromium. It requires more memory (the worker container is allocated up to 6 GB).

---

## Verifying the Setup

### 1. Health Check Endpoint

Once the backend is running, verify that PostgreSQL and Redis are connected:

```bash
curl http://localhost:8000/api/v1/health
```

Expected response:

```json
{
  "status": "ok",
  "db": "ok",
  "redis": "ok"
}
```

If either service shows an error, the status will be `"degraded"` with details.

### 2. Browser Pool Health

After running at least one study (or if using local Playwright mode):

```bash
curl http://localhost:8000/api/v1/health/browser
```

### 3. Frontend

Open **http://localhost:3000** in your browser. You should see the Mirror dashboard. If the page loads but API calls fail, make sure the backend is running on port 8000.

### 4. Run Tests

```bash
# Backend tests
make test

# Backend tests with coverage
make test-cov

# Frontend tests
cd frontend && npx vitest

# Frontend tests (single run, no watch mode)
cd frontend && npx vitest run
```

---

## Useful Commands Reference

| Command | Description |
|---------|-------------|
| `make dev-all` | Start everything (Docker infra + backend + worker + frontend) |
| `make dev` | Start backend API only |
| `make worker` | Start arq worker |
| `make dev-worker` | Start arq worker with auto-reload |
| `make docker-up` | Start PostgreSQL + Redis containers |
| `make docker-down` | Stop all Docker containers |
| `make migrate` | Run pending database migrations |
| `make install` | Install backend dependencies + Playwright Chromium |
| `make seed` | Seed persona templates into the database |
| `make test` | Run backend tests |
| `make test-cov` | Run backend tests with coverage report |
| `make lint` | Check backend code (Ruff) |
| `make format` | Auto-fix backend code formatting (Ruff) |
| `cd frontend && npx eslint .` | Lint frontend code |
| `cd frontend && npx vitest` | Run frontend tests (watch mode) |

---

## Troubleshooting

### Port already in use

If port 5432, 6379, 8000, or 3000 is already occupied:

```bash
# Find what is using the port
lsof -i :8000

# Kill the process
kill -9 <PID>
```

Or change the port for the backend:

```bash
uvicorn app.main:app --reload --port 8001
```

If you change the backend port, update `next.config.ts` so the frontend proxy points to the new port.

### Docker containers fail to start

```bash
# Check container logs
docker compose logs postgres
docker compose logs redis

# Reset everything (removes volumes -- deletes database data)
docker compose down -v
docker compose up -d postgres redis
```

### `alembic upgrade head` fails

- Make sure PostgreSQL is running: `docker compose ps`
- Make sure `DATABASE_URL` in your `.env` file is correct
- If connecting locally (not via Docker), the URL should use `localhost:5432`

### Frontend loads but API calls fail

- Verify the backend is running on port 8000: `curl http://localhost:8000/api/v1/health`
- The frontend proxies `/api/v1/*` to `localhost:8000` -- if the backend is on a different port, update `frontend/next.config.ts`

### Playwright `browser not found` errors

Reinstall the Chromium browser:

```bash
cd backend
source .venv/bin/activate
playwright install chromium
```

### Python virtual environment issues

If packages are missing or imports fail:

```bash
cd backend
rm -rf .venv
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

### Tailwind CSS styles not applied

- Make sure `postcss.config.mjs` exists in the `frontend/` directory -- do not delete it
- The project uses Tailwind CSS v4.0.7. Do not upgrade past v4.0.7 (v4.1.x has a known compatibility issue with Next.js Turbopack)

### Health check returns `"degraded"`

Check which service is down:

```bash
# PostgreSQL
docker compose exec postgres pg_isready -U mirror

# Redis
docker compose exec redis redis-cli ping
```

Restart the failing container:

```bash
docker compose restart postgres
# or
docker compose restart redis
```
