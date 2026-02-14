# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# MIRROR — AI User Testing Platform

## What Is Mirror

Mirror is an AI-powered usability testing platform. Users paste a URL, define tasks, select AI personas, and Mirror launches real browsers (via Playwright) where each persona navigates the live site. Claude Opus 4.6 analyzes every screenshot, generates think-aloud narration, detects UX issues, and produces a comparative insight report. Traditional user testing costs $12K+ and takes weeks — Mirror delivers 80% of those insights in 5 minutes.

**Tagline:** "Watch AI personas break your website — so real users don't have to."

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js (App Router) | 16.x |
| Language (FE) | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| Components | shadcn/ui | latest |
| State | Zustand | 5.x |
| Data Fetching | TanStack Query (React Query) | 5.x |
| Charts | Recharts | 2.x |
| Animations | Framer Motion | 11.x |
| Backend | FastAPI | 0.115+ |
| Language (BE) | Python | 3.12+ |
| Database | PostgreSQL | 16+ |
| ORM | SQLAlchemy 2.0 (async) | 2.0+ |
| Migrations | Alembic | 1.13+ |
| Cache / PubSub | Redis | 7+ |
| Job Queue | arq (async Redis queue) | 0.26+ |
| Browser Automation | Playwright (Python) via Browserbase (cloud) | 1.49+ |
| Site Pre-Crawling | Firecrawl (sitemap + content extraction) | latest |
| AI Browser Fallback | Stagehand SDK (Browserbase) | latest |
| AI / LLM | Anthropic SDK (Python) | 0.40+ |
| Models | claude-opus-4-6 (primary), claude-sonnet-4-5 (routing) |
| Screenshot Storage | Cloudflare R2 (S3-compatible, zero egress fees) |
| LLM Observability | Langfuse (token tracking, cost per study) |
| PDF Generation | WeasyPrint | 62+ |
| Heatmaps | Pillow (backend) + Canvas (frontend) |
| Auth | Clerk | latest |
| WebSocket | FastAPI native WebSocket + Redis pub/sub |
| Containerization | Docker Compose | 2.x |
| Testing (BE) | pytest + pytest-asyncio |
| Testing (FE) | Vitest + React Testing Library |
| Linting (BE) | Ruff |
| Linting (FE) | ESLint + Prettier |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js 15)                        │
│  Pages: Dashboard, Study Setup, Running, Results, Replay,       │
│         Heatmap, Report, Persona Library, Custom Builder         │
│  Connects via: REST (TanStack Query) + WebSocket (real-time)     │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP / WS
┌──────────────────────────────┴──────────────────────────────────┐
│                    BACKEND API (FastAPI)                          │
│                                                                  │
│  ┌─────────────┐  ┌───────────────┐  ┌────────────────────────┐ │
│  │ REST API    │  │ WebSocket Hub │  │ Study Orchestrator     │ │
│  │ /api/v1/*   │  │ (Redis PubSub)│  │ (dispatches to workers)│ │
│  └──────┬──────┘  └───────┬───────┘  └───────────┬────────────┘ │
│         │                 │                       │              │
│  ┌──────┴─────────────────┴───────────────────────┴────────────┐ │
│  │                    SERVICE LAYER                              │ │
│  │  StudyService │ PersonaService │ SessionService │ ReportSvc  │ │
│  └──────┬───────────────────────────────────────────────────────┘ │
│         │                                                        │
│  ┌──────┴───────────────────────────────────────────────────────┐ │
│  │                    DATA LAYER                                 │ │
│  │  PostgreSQL (SQLAlchemy async) │ Redis (cache) │ FileStorage  │ │
│  └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────┴──────────────────────────────────┐
│                    WORKER LAYER (arq)                             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │                 NAVIGATION ENGINE                             ││
│  │  Per-persona agent loop:                                     ││
│  │  PERCEIVE (screenshot + a11y) → THINK (Opus 4.6 vision) →   ││
│  │  ACT (Playwright action) → RECORD (save step data)           ││
│  │  Runs N personas in parallel via asyncio                     ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │                 ANALYSIS ENGINE                               ││
│  │  Screenshot Analyzer (Opus 4.6 vision per step)              ││
│  │  Cross-Persona Synthesizer (comparative insights)            ││
│  │  Heatmap Generator (aggregate click/scroll data)             ││
│  │  Report Builder (PDF + Markdown export)                      ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │                 PERSONA ENGINE                                ││
│  │  Template library (20+ pre-built personas)                   ││
│  │  Custom generation (natural language → full persona via LLM) ││
│  │  Behavioral modeling (attributes → navigation behavior)      ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │                 PLAYWRIGHT BROWSER POOL                       ││
│  │  Headless Chromium instances, one per persona session        ││
│  │  Managed lifecycle: create → use → screenshot → destroy      ││
│  └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
mirror/
├── CLAUDE.md                          # This file
├── docker-compose.yml                 # PostgreSQL, Redis, backend, frontend
├── .env.example                       # Environment variable template
├── Makefile                           # Common commands (dev, test, lint, build)
│
├── backend/
│   ├── pyproject.toml                 # Python project config (ruff, pytest, deps)
│   ├── alembic.ini                    # Alembic migration config
│   ├── alembic/                       # Database migrations
│   │   └── versions/
│   │
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI app factory + lifespan
│   │   ├── config.py                  # Pydantic Settings (env vars)
│   │   ├── dependencies.py            # FastAPI dependency injection
│   │   │
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── router.py              # Main API router (mounts all sub-routers)
│   │   │   ├── v1/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── studies.py          # Study CRUD + run endpoints
│   │   │   │   ├── sessions.py         # Session + step endpoints
│   │   │   │   ├── personas.py         # Persona templates + generation
│   │   │   │   ├── reports.py          # Report generation + export
│   │   │   │   ├── screenshots.py      # Screenshot serving
│   │   │   │   └── health.py           # Health check endpoint
│   │   │   └── ws/
│   │   │       ├── __init__.py
│   │   │       └── progress.py         # WebSocket for study progress
│   │   │
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── base.py                 # SQLAlchemy base + mixins
│   │   │   ├── study.py                # Study model
│   │   │   ├── task.py                 # Task model
│   │   │   ├── persona.py              # Persona model
│   │   │   ├── session.py              # Session model
│   │   │   ├── step.py                 # Step model
│   │   │   ├── issue.py                # Issue model
│   │   │   └── insight.py              # Insight model
│   │   │
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── study.py                # Pydantic schemas for study endpoints
│   │   │   ├── session.py
│   │   │   ├── persona.py
│   │   │   ├── report.py
│   │   │   └── ws.py                   # WebSocket message schemas
│   │   │
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── study_service.py        # Study business logic
│   │   │   ├── persona_service.py      # Persona CRUD + generation
│   │   │   ├── session_service.py      # Session data access
│   │   │   └── report_service.py       # Report generation
│   │   │
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── orchestrator.py         # Study orchestrator (manages parallel sessions)
│   │   │   ├── navigator.py            # Navigation agent loop (per persona)
│   │   │   ├── analyzer.py             # Screenshot UX analyzer (Opus vision)
│   │   │   ├── synthesizer.py          # Cross-persona insight synthesis
│   │   │   ├── persona_engine.py       # Persona generation + behavioral modeling
│   │   │   ├── heatmap.py              # Click/scroll heatmap generation
│   │   │   └── report_builder.py       # PDF + Markdown report builder
│   │   │
│   │   ├── browser/
│   │   │   ├── __init__.py
│   │   │   ├── pool.py                 # Playwright browser pool lifecycle
│   │   │   ├── actions.py              # Browser actions (click, type, scroll, etc.)
│   │   │   └── screenshots.py          # Screenshot capture + annotation
│   │   │
│   │   ├── llm/
│   │   │   ├── __init__.py
│   │   │   ├── client.py               # Anthropic API client (with model routing)
│   │   │   ├── prompts.py              # All system prompts for 5 pipeline stages
│   │   │   └── schemas.py              # Pydantic models for LLM JSON responses
│   │   │
│   │   ├── storage/
│   │   │   ├── __init__.py
│   │   │   └── file_storage.py         # File storage (local FS, S3-compatible interface)
│   │   │
│   │   ├── db/
│   │   │   ├── __init__.py
│   │   │   ├── engine.py               # Async SQLAlchemy engine + session factory
│   │   │   └── repositories/           # Data access layer
│   │   │       ├── __init__.py
│   │   │       ├── study_repo.py
│   │   │       ├── session_repo.py
│   │   │       └── persona_repo.py
│   │   │
│   │   ├── workers/
│   │   │   ├── __init__.py
│   │   │   ├── settings.py             # arq worker settings
│   │   │   └── tasks.py                # Background task definitions
│   │   │
│   │   └── data/
│   │       ├── persona_templates.json   # 20+ pre-built persona templates
│   │       └── heuristics.json          # Nielsen's 10 heuristics reference
│   │
│   └── tests/
│       ├── conftest.py
│       ├── test_api/
│       ├── test_core/
│       └── test_browser/
│
├── frontend/
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── components.json                  # shadcn/ui config
│   │
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx               # Root layout (header, providers)
│   │   │   ├── page.tsx                 # Landing / Dashboard
│   │   │   ├── study/
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx         # Study setup wizard
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx         # Results dashboard
│   │   │   │       ├── running/
│   │   │   │       │   └── page.tsx     # Live progress view
│   │   │   │       ├── session/
│   │   │   │       │   └── [sessionId]/
│   │   │   │       │       └── page.tsx # Session replay
│   │   │   │       ├── heatmap/
│   │   │   │       │   └── page.tsx     # Heatmap view
│   │   │   │       └── report/
│   │   │   │           └── page.tsx     # Report preview + export
│   │   │   └── personas/
│   │   │       ├── page.tsx             # Persona library
│   │   │       └── builder/
│   │   │           └── page.tsx         # Custom persona builder
│   │   │
│   │   ├── components/
│   │   │   ├── ui/                      # shadcn/ui primitives
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── Footer.tsx
│   │   │   ├── study/
│   │   │   │   ├── StudyCard.tsx
│   │   │   │   ├── StudySetupWizard.tsx
│   │   │   │   ├── TaskInput.tsx
│   │   │   │   └── StudyProgress.tsx
│   │   │   ├── persona/
│   │   │   │   ├── PersonaCard.tsx
│   │   │   │   ├── PersonaSelector.tsx
│   │   │   │   └── PersonaBuilder.tsx
│   │   │   ├── results/
│   │   │   │   ├── ScoreCard.tsx
│   │   │   │   ├── StruggleMap.tsx
│   │   │   │   ├── IssueList.tsx
│   │   │   │   ├── PersonaComparison.tsx
│   │   │   │   └── RecommendationList.tsx
│   │   │   ├── session/
│   │   │   │   ├── SessionReplay.tsx
│   │   │   │   ├── ScreenshotViewer.tsx
│   │   │   │   ├── ThinkAloudBubble.tsx
│   │   │   │   └── StepTimeline.tsx
│   │   │   ├── heatmap/
│   │   │   │   ├── ClickHeatmap.tsx
│   │   │   │   └── HeatmapOverlay.tsx
│   │   │   └── common/
│   │   │       ├── ProgressBar.tsx
│   │   │       ├── ExportButton.tsx
│   │   │       └── EmptyState.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── use-study.ts
│   │   │   ├── use-websocket.ts
│   │   │   ├── use-session-replay.ts
│   │   │   └── use-personas.ts
│   │   │
│   │   ├── lib/
│   │   │   ├── api-client.ts            # Typed API client (fetch wrapper)
│   │   │   ├── ws-client.ts             # WebSocket client
│   │   │   ├── utils.ts                 # Utility functions
│   │   │   └── constants.ts             # App constants
│   │   │
│   │   ├── stores/
│   │   │   ├── study-store.ts           # Zustand store for study state
│   │   │   └── ui-store.ts              # UI state (sidebar, theme, etc.)
│   │   │
│   │   └── types/
│   │       └── index.ts                 # Shared TypeScript types
│   │
│   └── public/
│       ├── mirror-logo.svg
│       └── og-image.png
│
└── data/                                # Runtime data (gitignored)
    └── studies/
        └── {study_id}/
            ├── sessions/
            │   └── {session_id}/
            │       └── steps/
            │           ├── step_001.png
            │           └── step_001.json
            ├── heatmaps/
            ├── analysis.json
            └── report.pdf
```

---

## Coding Conventions

### Python (Backend)

- **Style**: Ruff for formatting and linting (replaces black + isort + flake8)
- **Type hints**: Required on all function signatures
- **Async**: Use `async/await` everywhere — FastAPI, SQLAlchemy, httpx, Playwright
- **Naming**: `snake_case` for functions/variables, `PascalCase` for classes, `UPPER_SNAKE_CASE` for constants
- **Imports**: Group as stdlib → third-party → local, sorted by Ruff
- **Models**: SQLAlchemy models in `models/`, Pydantic schemas in `schemas/`, LLM response schemas in `llm/schemas.py`
- **Error handling**: Use FastAPI HTTPException for API errors. Use custom exceptions in core/ layer, caught and translated in API layer
- **Docstrings**: Required on public functions and classes. Google style
- **Testing**: pytest with pytest-asyncio. Fixtures in conftest.py. Use factories for test data

### TypeScript (Frontend)

- **Style**: ESLint + Prettier (2-space indent, single quotes, trailing commas)
- **Components**: Functional components with arrow syntax. Props typed with interface
- **Naming**: `camelCase` for functions/variables, `PascalCase` for components/types, `kebab-case` for files
- **State**: Zustand for global state. TanStack Query for server state. Local useState only for UI-only state
- **API calls**: All through `lib/api-client.ts` using TanStack Query hooks
- **Styling**: Tailwind utility classes. Use `cn()` helper from shadcn for conditional classes
- **No prop drilling**: Use Zustand or React Context for shared state
- **Error boundaries**: Wrap major page sections in error boundaries

### Shared

- **Commit messages**: Conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`)
- **Branch naming**: `feat/study-setup`, `fix/websocket-reconnect`, `refactor/persona-engine`
- **No `any` types** in TypeScript. No `# type: ignore` in Python unless absolutely necessary with explanation

---

## API Contract (v1)

### REST Endpoints

```
# Studies
POST   /api/v1/studies                     Create study (body: url, tasks, persona_ids)
GET    /api/v1/studies                     List studies (query: page, limit, status)
GET    /api/v1/studies/{id}                Get study with summary results
DELETE /api/v1/studies/{id}                Delete study + all data
POST   /api/v1/studies/{id}/run            Start running the study → returns job_id
GET    /api/v1/studies/{id}/status          Poll study progress

# Sessions
GET    /api/v1/studies/{id}/sessions       List sessions for a study
GET    /api/v1/sessions/{id}               Get session detail
GET    /api/v1/sessions/{id}/steps         Get all steps (query: page, limit)
GET    /api/v1/sessions/{id}/steps/{n}     Get single step

# Analysis
GET    /api/v1/studies/{id}/issues         List issues (query: severity, persona_id, page_url)
GET    /api/v1/studies/{id}/insights       Get synthesized insights
GET    /api/v1/studies/{id}/heatmap        Get heatmap data (query: page_url)

# Reports
GET    /api/v1/studies/{id}/report         Get report metadata
GET    /api/v1/studies/{id}/report/pdf     Download PDF report
GET    /api/v1/studies/{id}/report/md      Download Markdown report

# Personas
GET    /api/v1/personas/templates          List pre-built templates
GET    /api/v1/personas/templates/{id}     Get template detail
POST   /api/v1/personas/generate           Generate custom persona from description
GET    /api/v1/personas/{id}               Get persona detail

# Assets
GET    /api/v1/screenshots/{path}          Serve screenshot images (signed path)

# Health
GET    /api/v1/health                      Health check (db + redis + playwright)
```

### WebSocket Events

```
# Client → Server
{ "type": "subscribe", "study_id": "uuid" }
{ "type": "unsubscribe", "study_id": "uuid" }

# Server → Client
{ "type": "study:progress", "study_id": "...", "percent": 45, "phase": "navigating" }
{ "type": "session:step", "session_id": "...", "persona_name": "...",
  "step_number": 8, "think_aloud": "...", "screenshot_url": "...",
  "emotional_state": "confused", "action": "click", "task_progress": 40 }
{ "type": "session:complete", "session_id": "...", "completed": true, "total_steps": 18 }
{ "type": "study:analyzing", "study_id": "...", "phase": "synthesis" }
{ "type": "study:complete", "study_id": "...", "score": 72, "issues_count": 14 }
{ "type": "study:error", "study_id": "...", "error": "..." }
```

---

## Database Schema (Core Entities)

All tables use UUID primary keys, `created_at`/`updated_at` timestamps.

- **studies**: id, url, starting_path, status (setup|running|analyzing|complete|failed), overall_score, executive_summary
- **tasks**: id, study_id (FK), description, order_index
- **personas**: id, study_id (FK), template_id, profile (JSONB), is_custom
- **sessions**: id, study_id (FK), persona_id (FK), task_id (FK), status (pending|running|complete|failed|gave_up), total_steps, task_completed, summary, emotional_arc (JSONB)
- **steps**: id, session_id (FK), step_number, page_url, page_title, screenshot_path, think_aloud, action_type, action_selector, action_value, confidence, task_progress, emotional_state, click_x, click_y, viewport_width, viewport_height
- **issues**: id, step_id (FK), session_id (FK), study_id (FK), element, description, severity (critical|major|minor|enhancement), heuristic, wcag_criterion, recommendation, page_url
- **insights**: id, study_id (FK), type (universal|persona_specific|comparative|recommendation), title, description, severity, impact, effort, personas_affected (JSONB), evidence (JSONB), rank
- **persona_templates**: id, name, emoji, category, short_description, default_profile (JSONB)

---

## Environment Variables

```bash
# === ESSENTIAL ===
ANTHROPIC_API_KEY=sk-ant-...                          # Claude API
BROWSERBASE_API_KEY=bb_...                            # Cloud browsers
BROWSERBASE_PROJECT_ID=proj_...                       # Browserbase project
DATABASE_URL=postgresql+asyncpg://mirror:mirror@localhost:5432/mirror
REDIS_URL=redis://localhost:6379/0

# === RECOMMENDED ===
FIRECRAWL_API_KEY=fc-...                              # Site pre-crawling
R2_ACCESS_KEY_ID=...                                  # Cloudflare R2
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=mirror-screenshots
R2_ENDPOINT_URL=https://xxx.r2.cloudflarestorage.com
CLERK_SECRET_KEY=sk_...                               # Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
LANGFUSE_PUBLIC_KEY=pk-...                            # LLM observability
LANGFUSE_SECRET_KEY=sk-...
LANGFUSE_HOST=https://cloud.langfuse.com
SENTRY_DSN=https://...@sentry.io/...                  # Error monitoring
RESEND_API_KEY=re_...                                 # Email

# === APP CONFIG ===
OPUS_MODEL=claude-opus-4-6
SONNET_MODEL=claude-sonnet-4-5-20250929
MAX_CONCURRENT_SESSIONS=5
MAX_STEPS_PER_SESSION=30
STUDY_TIMEOUT_SECONDS=600
STORAGE_PATH=./data                                   # Local fallback
LOG_LEVEL=INFO
```

---

## Common Development Commands

```bash
# ── Quick Start (everything at once) ──
make dev-all                          # Starts Docker infra + backend + worker + frontend via scripts/dev.sh

# ── Infrastructure ──
make docker-up                        # Start PostgreSQL + Redis containers
make docker-down                      # Stop all containers

# ── Backend ──
make dev                              # Backend API only (uvicorn --reload on :8000)
make worker                           # arq worker (production mode)
make dev-worker                       # arq worker with auto-reload (uses scripts/dev_worker.py)

# ── Frontend ──
cd frontend && npx next dev --webpack # IMPORTANT: must use --webpack flag (see Turbopack note below)

# ── Database ──
make migrate                          # Run pending migrations (alembic upgrade head)
make migrate-create msg="add foo"     # Create new migration
make seed                             # Seed persona templates into DB

# ── Testing ──
make test                             # Backend tests (pytest -v)
make test-cov                         # Backend tests with coverage report
cd backend && python -m pytest tests/test_api/test_studies.py -v   # Single test file
cd backend && python -m pytest tests/ -k "test_name" -v            # Single test by name
cd frontend && npx vitest             # Frontend tests (Vitest)
cd frontend && npx vitest run         # Frontend tests (single run, no watch)

# ── Linting & Formatting ──
make lint                             # Check backend (ruff check + format --check)
make format                           # Fix backend (ruff check --fix + format)
cd frontend && npx eslint .           # Frontend lint

# ── Setup (first time) ──
make install                          # Install backend deps + Playwright Chromium
cd frontend && npm install            # Install frontend deps

# ── Local Playwright Mode (no Browserbase) ──
make docker-local                     # Full stack with local Chromium in Docker
make health-browser                   # Check browser pool health
```

## Critical: Tailwind CSS v4 + Turbopack

`postcss.config.mjs` with `@tailwindcss/postcss` + Tailwind v4 causes Turbopack to hang indefinitely. **Always run Next.js with the `--webpack` flag:**

```bash
npx next dev --webpack                # Correct — uses webpack
npx next dev                          # WRONG — Turbopack hangs forever
```

Do NOT remove `postcss.config.mjs` — without it, Tailwind CSS won't process at all. The `globals.css` imports from `../styles/tw-animate.css` and `../styles/shadcn.css` (local copies in `src/styles/`).

## Running the Project (Manual Setup)

```bash
# Start infrastructure (PostgreSQL + Redis)
docker compose up -d postgres redis

# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
playwright install chromium
alembic upgrade head                  # Run migrations
uvicorn app.main:app --reload --port 8000

# Worker (separate terminal)
arq app.workers.settings.WorkerSettings

# Frontend (MUST use --webpack flag)
cd frontend
npm install
npx next dev --webpack                # Starts on port 3000

# Full stack (Docker)
docker compose up --build
```

## Frontend Proxy

The frontend proxies `/api/v1/*` requests to the backend via `next.config.ts` rewrites. In development, the backend runs on `:8000` and the frontend on `:3000` — API calls from the browser go to `:3000/api/v1/...` and get forwarded.

---

## Key Design Decisions

1. **Python backend (not Node)**: Playwright Python + Anthropic Python SDK + asyncio = tightest integration. NumPy/Pillow for heatmaps. The browser automation and AI pipeline are CPU/IO bound, not compute bound.

2. **PostgreSQL over SQLite**: Multi-connection support needed for concurrent study runs. JSONB for flexible persona profiles and step metadata. Proper async support via asyncpg.

3. **arq over Celery**: Lightweight, native async, Redis-based. Perfect for our use case (browser sessions are async IO). Avoids Celery's complexity.

4. **Model routing**: Use Opus 4.6 for persona generation, insight synthesis, and report generation (needs deep reasoning). Use Sonnet 4.5 for per-step navigation decisions and screenshot analysis (cost optimization, acceptable quality). Configurable per pipeline stage.

5. **Cloudflare R2 for storage**: S3-compatible with zero egress fees. Critical because session replays load many screenshots. Local filesystem fallback for development via abstract storage interface.

6. **Browserbase for browser hosting**: Instead of managing local Chromium instances (memory leaks, crashes, scaling), Browserbase provides managed headless browsers in the cloud. We connect via Playwright's CDP protocol — same code, cloud infrastructure. Stagehand SDK as fallback for tricky element selection.

7. **Firecrawl for site reconnaissance**: Before personas navigate, Firecrawl pre-crawls the target site to discover pages, extract content, and build a sitemap. This gives the navigation engine a "map" to work with, making persona navigation smarter and reducing wasted steps.

8. **Langfuse for LLM observability**: With 200+ API calls per study across 5 pipeline stages, we need visibility into token usage, costs, latency, and failures. Langfuse wraps the Anthropic client with zero code change.

9. **WebSocket + Redis PubSub**: Workers publish step updates to Redis channels. WebSocket hub subscribes and forwards to connected clients. Decouples workers from WebSocket connections.

10. **Pre-built persona templates + custom generation**: 20+ templates cover common demographics. Custom personas generated via Opus 4.6 from natural language descriptions. Both produce the same PersonaProfile schema.

11. **Separate navigation and analysis passes**: Navigation uses Opus/Sonnet for real-time decision-making (speed matters). Post-session analysis uses Opus for deeper screenshot analysis (quality matters). This two-pass approach balances speed and depth.

---

## LLM Pipeline Stages

Mirror uses Claude in 5 distinct stages:

| Stage | Model | Input | Output | Vision? |
|-------|-------|-------|--------|---------|
| 1. Persona Generation | Opus | Template or description | PersonaProfile JSON | No |
| 2. Navigation Decisions | Sonnet (default) or Opus | Screenshot + a11y tree + context | Think-aloud + action + UX issues | Yes |
| 3. Screenshot Analysis | Opus | Screenshot + page context | Detailed visual UX audit | Yes |
| 4. Insight Synthesis | Opus | All session data | Cross-persona comparative analysis | No |
| 5. Report Generation | Opus | All analysis data | PDF/Markdown report | No |

All prompts are defined in `backend/app/llm/prompts.py`. All response schemas in `backend/app/llm/schemas.py`.

---

## Important Patterns

- **Study lifecycle**: `setup` → `running` (navigation) → `analyzing` (post-processing) → `complete`
- **Error handling in navigation**: If a persona gets stuck (same page 3+ times), it can "give up". If Playwright crashes, the session is marked `failed`. The study continues with remaining personas.
- **Screenshot naming**: `{study_id}/{session_id}/steps/step_{NNN}.png` — zero-padded 3-digit step number
- **Heatmap generation**: Aggregate click_x/click_y from all steps on the same page_url. Normalize to viewport. Generate overlay PNG with Pillow using gaussian blur.
- **Report generation**: First generate Markdown (structured). Then convert to PDF via WeasyPrint with custom CSS template.
