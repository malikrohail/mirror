# Mirror

**Our AI testers don't just analyze websites. They become people.**

Usability testing costs $12,000+ and takes weeks to recruit, run, and synthesize. Mirror does it in 5 minutes. Paste a URL, pick some personas, and watch AI navigate your live site in real browsers — thinking aloud the entire time.

> *"I see a big blue button but I don't know what 'Get Started' means. Started with what? I'd rather look for a phone number."*
> — 72-year-old retired librarian persona, navigating a SaaS landing page

> *"Standard SaaS landing page. CTA is obvious. Let me check the pricing first."*
> — 24-year-old developer persona, same page

Same page. Completely different experience. That's the whole point of usability testing — and Mirror generates it on demand.

## Built for the [Claude Code Hackathon](https://cerebralvalley.ai/e/claude-code-hackathon) (Feb 2026)

**Track:** Break the Barriers — putting professional UX research in everyone's hands.

---

## How It Works

1. **Paste a URL** and describe what you want tested ("Sign up for a free trial")
2. **Pick personas** — 20+ templates or describe your own in plain English
3. **Watch live** — real cloud browsers, one per persona, with think-aloud narration streaming in
4. **Get results** — UX scores, severity-ranked issues, session replays, heatmaps, PDF report

Each persona has behavioral traits (tech literacy, patience, trust level, accessibility needs) that genuinely change how they navigate. A low-patience persona gives up faster. A screen-reader user flags unlabeled buttons. These behaviors aren't scripted — they emerge from Opus 4.6 reasoning through personality in context.

## How We Use Opus 4.6

This isn't a wrapper around one API call. It's a 5-stage pipeline with 200+ LLM calls per study:

| Stage | Model | What Happens |
|-------|-------|-------------|
| **Persona Generation** | Opus 4.6 | Natural language description -> full behavioral profile with 10+ consistent attributes |
| **Navigation** | Sonnet 4.5 | Screenshot + Computer Use (coordinate-based clicks) -> think-aloud + next action (50-150 calls per study) |
| **Screenshot Analysis** | Opus 4.6 | Deep visual UX audit: Nielsen's heuristics + WCAG 2.1 on every page |
| **Cross-Persona Synthesis** | Opus 4.6 | Compares all personas' experiences, finds universal vs persona-specific issues |
| **Report Generation** | Opus 4.6 | Professional PDF/Markdown report with prioritized recommendations |

**Model routing** — Sonnet 4.5 with Computer Use for navigation (coordinate-based clicks, no CSS selectors needed), Opus for depth during analysis (quality matters when you're synthesizing insights). Extended thinking for complex cross-persona synthesis.

**Vision is the unlock.** Every screenshot is sent with a full persona identity. Opus doesn't just see UI elements — it evaluates them as a specific person would.

See [docs/ai-and-llm-pipeline.md](docs/ai-and-llm-pipeline.md) for the full technical deep-dive.

## Key Features

- **Real browser testing** — Playwright + Browserbase cloud browsers, not simulated clicks
- **Computer Use navigation** — Sonnet 4.5 drives browsers via coordinate-based clicks (no CSS selectors), just like a real user
- **AI think-aloud narration** — first-person inner monologue reflecting the persona's experience
- **20+ persona templates** — from tech-savvy developers to elderly first-time users
- **Custom persona generation** — describe a user in plain English, get a full behavioral profile
- **Live progress view** — watch each persona navigate with real-time WebSocket streaming
- **Session replay** — step-by-step playback with screenshots, actions, emotional state
- **Click heatmaps** — aggregated interaction data across all personas
- **Comparative analysis** — "the elderly persona took 22 steps, the developer took 5"
- **PDF/Markdown reports** — exportable reports with scores, issues, and fix suggestions
- **Accessibility audits** — WCAG 2.1 AA analysis using vision (catches what automated tools miss)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS v4, shadcn/ui, Framer Motion |
| State | Zustand + TanStack Query |
| Backend | FastAPI, Python 3.12, async everywhere |
| Database | PostgreSQL 16 + SQLAlchemy 2.0 (async) |
| Cache/PubSub | Redis 7 |
| Browser Automation | Playwright via Browserbase (cloud) + Claude Computer Use |
| AI/LLM | Claude Opus 4.6 + Sonnet 4.5 (Computer Use navigation) |
| Real-time | WebSocket + Redis pub/sub |
| Job Queue | arq (async Redis queue) |
| Observability | Langfuse (token tracking, cost per study) |

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
                                    │  Analysis Engine     │  Claude Opus 4.6 vision
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

### Deployment

Production runs on a DigitalOcean droplet at [miror.tech](https://miror.tech) — deploy with `make deploy` (rsync + `docker compose -f docker-compose.prod.yml up -d --build`).

### Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
ANTHROPIC_API_KEY=sk-ant-...       # Required — Claude API
BROWSERBASE_API_KEY=bb_...          # Required — Cloud browsers
BROWSERBASE_PROJECT_ID=proj_...     # Required — Browserbase project
DATABASE_URL=postgresql+asyncpg://mirror:mirror@localhost:5432/mirror
REDIS_URL=redis://localhost:6379/0
USE_COMPUTER_USE=true               # Sonnet 4.5 Computer Use navigation (coordinate-based)
```

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
│   ├── src/hooks/     TanStack Query hooks
│   ├── src/stores/    Zustand state management
│   └── src/lib/       API client, WebSocket client, utilities
└── docs/              Architecture and pipeline documentation
```

## Team

Built by [Meir Rosenschein](https://github.com/meirrosenschein) and [Malik Rohail](https://github.com/malikrohail).

## License

MIT
