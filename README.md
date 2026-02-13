# Mirror

**Watch AI personas break your website — so real users don't have to.**

Mirror is an AI-powered usability testing platform. Paste a URL, define tasks, select AI personas, and Mirror launches real cloud browsers where each persona navigates your live site. Claude Opus analyzes every screenshot, generates think-aloud narration, detects UX issues, and produces a comparative insight report.

Traditional user testing costs $12K+ and takes weeks. Mirror delivers 80% of those insights in 5 minutes.

---

## How It Works

1. **Paste a URL** and describe the tasks you want tested
2. **Choose AI personas** from 20+ templates (or generate custom ones)
3. **Watch in real-time** as personas navigate your site in cloud browsers
4. **Get results** — usability scores, UX issues, heatmaps, and a full report

Each persona has distinct traits (tech literacy, patience, accessibility needs) that affect how they interact with your site, producing diverse and realistic test coverage.

## Key Features

- **Real browser testing** — Playwright + Browserbase cloud browsers, not simulated clicks
- **AI think-aloud narration** — Claude Opus vision analyzes every screenshot in real-time
- **20+ persona templates** — From tech-savvy developers to elderly first-time users
- **Custom persona generation** — Describe a user in plain English, get a full behavioral profile
- **Live progress view** — Watch each persona navigate with embedded browser streams
- **Session replay** — Step-by-step playback with screenshots, actions, and narration
- **Click heatmaps** — Aggregated interaction data across all personas
- **Comparative analysis** — Cross-persona insight synthesis and recommendations
- **PDF/Markdown reports** — Exportable reports with scores, issues, and fix suggestions
- **Scheduled testing** — Recurring tests with score tracking over time
- **Study comparison** — Track fixed/new/regressed issues between test runs

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS v4, shadcn/ui |
| State | Zustand + TanStack Query |
| Backend | FastAPI, Python 3.12, async everywhere |
| Database | PostgreSQL 16 + SQLAlchemy 2.0 (async) |
| Cache/PubSub | Redis 7 |
| Browser Automation | Playwright via Browserbase (cloud) |
| AI/LLM | Claude Opus 4.6 (analysis) + Sonnet 4.5 (navigation) |
| Real-time | WebSocket + Redis pub/sub |
| Job Queue | arq (async Redis queue) |

## Architecture

```
Frontend (Next.js) ── REST + WebSocket ──> Backend API (FastAPI)
                                               │
                                    ┌──────────┴──────────┐
                                    │    Worker Layer      │
                                    │                      │
                                    │  Navigation Engine   │  Playwright browsers
                                    │  PERCEIVE → THINK    │  (Browserbase cloud)
                                    │  → ACT → RECORD      │
                                    │                      │
                                    │  Analysis Engine     │  Claude Opus vision
                                    │  Screenshot analysis │
                                    │  Cross-persona       │
                                    │  synthesis + reports │
                                    └──────────────────────┘
```

## Quick Start

```bash
# 1. Start infrastructure
docker compose up -d postgres redis

# 2. Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
playwright install chromium
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# 3. Worker (separate terminal)
cd backend && source .venv/bin/activate
arq app.workers.settings.WorkerSettings

# 4. Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 to start testing.

### Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
ANTHROPIC_API_KEY=sk-ant-...       # Required — Claude API
BROWSERBASE_API_KEY=bb_...          # Required — Cloud browsers
BROWSERBASE_PROJECT_ID=proj_...     # Required — Browserbase project
DATABASE_URL=postgresql+asyncpg://mirror:mirror@localhost:5432/mirror
REDIS_URL=redis://localhost:6379/0
```

## LLM Pipeline

Mirror uses Claude across 5 stages:

| Stage | Model | What it does |
|-------|-------|-------------|
| Persona Generation | Opus | Template or description -> full behavioral profile |
| Navigation Decisions | Sonnet | Screenshot + accessibility tree -> think-aloud + next action |
| Screenshot Analysis | Opus | Deep visual UX audit per step |
| Insight Synthesis | Opus | Cross-persona comparative analysis |
| Report Generation | Opus | PDF/Markdown report with recommendations |

## Project Structure

```
mirror/
├── backend/           Python FastAPI + Playwright + Claude pipeline
│   ├── app/api/       REST + WebSocket endpoints
│   ├── app/core/      Orchestrator, navigator, analyzer, synthesizer
│   ├── app/browser/   Playwright browser pool + actions
│   ├── app/llm/       Anthropic client, prompts, response schemas
│   ├── app/models/    SQLAlchemy database models
│   └── app/workers/   arq background job definitions
├── frontend/          Next.js 16 App Router
│   ├── src/app/       Pages (dashboard, study, replay, heatmap, report)
│   ├── src/components/ UI components (study, session, results, persona)
│   ├── src/hooks/     TanStack Query hooks for all endpoints
│   ├── src/stores/    Zustand state management
│   └── src/lib/       API client, WebSocket client, utilities
└── docs/              Architecture docs, competitive analysis, roadmap
```

## License

All rights reserved.
