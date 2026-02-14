# Mirror — AI User Testing Platform

## Hackathon Submission Document

**Tagline:** "Watch AI personas break your website — so real users don't have to."

**Team:** Mirror
**Built over:** 2 weeks
**Stack:** Next.js 16 + FastAPI + Claude Opus 4.6/Sonnet 4.5 + Playwright + PostgreSQL + Redis

---

## 1. What Mirror Does

Mirror is an AI-powered usability testing platform. Users paste a URL, define tasks, select AI personas, and Mirror launches real browsers where each persona navigates the live site. Claude Opus 4.6 analyzes every screenshot, generates think-aloud narration, detects UX issues, and produces a comparative insight report.

Traditional user testing costs $12K+ and takes weeks. Mirror delivers 80% of those insights in 5 minutes for under $1.

### The Core Loop

```
User pastes URL + defines task + selects personas
            ↓
Mirror launches real Chromium browsers (1 per persona)
            ↓
Each persona navigates the live site with think-aloud narration
  (PERCEIVE screenshot → THINK via Claude Vision → ACT in browser → RECORD)
            ↓
Post-session: deep screenshot analysis + cross-persona synthesis
            ↓
Output: UX score, issues, heatmaps, recommendations, PDF report
```

---

## 2. Problem Statement

- **Cost:** Traditional usability testing costs $12,000+ per study (recruiting, incentives, facilities, moderators)
- **Time:** Takes 2-4 weeks to recruit, schedule, conduct, and analyze
- **Scale:** Can only test with 5-8 real users per study
- **Bias:** Participants may not represent real user diversity (age, tech literacy, accessibility needs)
- **Frequency:** Teams test quarterly at best, missing regressions between releases

Mirror solves all five by replacing human participants with AI personas that navigate real websites in real browsers, generating the same qualitative and quantitative insights at 100x lower cost and 100x faster speed.

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 16)                         │
│  14 pages, 79 components, 13 hooks, WebSocket + polling         │
│  Zustand state, TanStack Query, shadcn/ui, Tailwind v4          │
└──────────────────────────────┬──────────────────────────────────┘
                               │ REST + WebSocket
┌──────────────────────────────┴──────────────────────────────────┐
│                   BACKEND API (FastAPI)                           │
│  40+ REST endpoints, 2 WebSocket endpoints                       │
│  Redis PubSub for real-time, arq job queue                       │
│  PostgreSQL (async) + Alembic migrations                         │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────┴──────────────────────────────────┐
│                   WORKER LAYER (arq)                              │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  NAVIGATION ENGINE (per-persona agent loop)                │  │
│  │  PERCEIVE → THINK (Claude Vision) → ACT (Playwright) →    │  │
│  │  RECORD (DB + Redis + WebSocket)                           │  │
│  │  Runs N personas in parallel via asyncio                   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  ANALYSIS ENGINE                                           │  │
│  │  Screenshot Analysis (Opus Vision) → Issue Detection →     │  │
│  │  Cross-Persona Synthesis → Heatmaps → PDF Report           │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  BROWSER POOL                                              │  │
│  │  Browserbase (cloud) ←→ Local Chromium (fallback)          │  │
│  │  Hybrid auto-failover, memory monitoring, health checks    │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 16 (App Router), TypeScript 5, Tailwind CSS v4 | Modern React with server components |
| UI Components | shadcn/ui + Radix UI | Accessible, themeable primitives |
| State | Zustand 5 (global) + TanStack Query 5 (server) | Minimal re-renders, automatic caching |
| Charts | Recharts 2 | Score trend visualizations |
| Animations | Framer Motion 11 + CSS animations | Typewriter effects, pulse indicators |
| Backend | FastAPI 0.115+ (Python 3.12+) | Async-native, Playwright/Anthropic SDK integration |
| Database | PostgreSQL 16 + SQLAlchemy 2.0 (async) | JSONB for flexible persona profiles, UUID PKs |
| Migrations | Alembic 1.13+ | 4 migration files tracking full schema evolution |
| Cache/PubSub | Redis 7 | Real-time WebSocket distribution, job queue backing |
| Job Queue | arq 0.26+ (async Redis queue) | Lightweight, native async, perfect for browser sessions |
| Browser | Playwright (Python) + Browserbase (cloud) | Real Chromium with cloud scaling + live view URLs |
| AI/LLM | Anthropic SDK, Claude Opus 4.6 + Sonnet 4.5 | Vision analysis, structured JSON output, model routing |
| Site Crawling | Firecrawl | Pre-navigation sitemap discovery |
| Observability | Langfuse | Token tracking, cost per study, latency monitoring |
| PDF | WeasyPrint | Professional report generation with custom CSS |
| Heatmaps | Pillow + NumPy (backend), Canvas (frontend) | Gaussian blur click density visualization |
| Storage | Cloudflare R2 (S3-compatible, zero egress) | Screenshot serving without bandwidth costs |
| Containerization | Docker Compose | PostgreSQL + Redis + backend + worker + frontend |

---

## 5. Complete Feature List

### 5.1 AI Navigation Engine

The core of Mirror. Each persona gets its own browser and runs an autonomous agent loop:

- **PERCEIVE:** Captures full-page screenshot + page accessibility tree at each step
- **THINK:** Sends screenshot to Claude (Sonnet for speed) with persona context, task description, and behavioral rules. Claude returns: think-aloud narration, next action, UX issues detected, task progress %, confidence score, emotional state
- **ACT:** Executes the action in the real browser via Playwright (click, type, scroll, navigate, go_back)
- **RECORD:** Saves screenshot to storage, step metadata to DB, publishes real-time event to Redis/WebSocket

**Behavioral modeling:** Each persona has 5 behavioral attributes (tech literacy, patience, reading speed, trust level, exploration tendency) on a 1-10 scale, which are translated into concrete behavioral rules injected into the navigation prompt. A low-patience persona gives up after 2-3 failed attempts. A low-tech-literacy persona reads every label carefully and gets confused by icons without text.

**Stuck detection:** If the same URL appears 3+ times in a row with no progress, the persona gives up — mimicking real user frustration.

**Cookie consent auto-dismissal:** 40+ CSS selectors for common consent frameworks (OneTrust, CookieBot, generic patterns). Dismissed automatically before navigation begins.

**Page blocker detection:** Detects CAPTCHAs, auth walls, and other blockers before wasting steps.

**Visual diff scoring:** Compares consecutive screenshots using Pillow/ImageChops to detect "nothing happened" clicks (Iteration 3).

**Per-session timeout:** Configurable timeout (default 120s) prevents runaway sessions.

**Background step recording:** RECORD phase runs as an asyncio background task, overlapping with the next step's PERCEIVE for ~0.5-1s savings per step.

### 5.2 AI Persona System

**20+ pre-built persona templates** covering real user diversity:
- Age ranges: 13 to 85+
- Tech literacy: low to expert
- Accessibility needs: low vision, screen reader, color blind, motor impairment, cognitive
- Patience levels: impatient clicker to methodical explorer
- Trust levels: skeptical to trusting

**Custom persona generation:** Describe a persona in natural language (e.g., "a 70-year-old retired teacher who is not comfortable with technology") and Claude Opus generates a full profile with behavioral attributes, frustration triggers, and accessibility needs.

**Template-to-profile optimization:** Pre-built templates are converted directly to PersonaProfiles without an LLM call, saving ~19 seconds per persona. String attributes ("high"/"low") are mapped to integer scales automatically.

**Behavioral rules engine:** Translates numerical attributes into concrete behavioral instructions:
- LOW TECH LITERACY: "You read every label carefully. Icons without text labels confuse you."
- LOW PATIENCE: "After 2-3 failed attempts you consider giving up. Loading delays annoy you."
- SKEPTICAL: "You hesitate before entering personal information. You look for privacy policies."
- SKIMMER: "You barely read body text. You scan for headings, buttons, and links."

### 5.3 5-Stage LLM Pipeline with Model Routing

| Stage | Model | Input | Output | Vision? |
|-------|-------|-------|--------|---------|
| 1. Persona Generation | Opus 4.6 | Template or description | Full PersonaProfile JSON | No |
| 2. Navigation Decisions | Sonnet 4.5 | Screenshot + a11y tree + context | Think-aloud + action + UX issues | Yes |
| 3. Screenshot Analysis | Opus 4.6 | Screenshot + page context | Detailed visual UX audit (1-10 scores) | Yes |
| 4. Insight Synthesis | Opus 4.6 | All session data | Cross-persona comparative analysis | No |
| 5. Report Generation | Opus 4.6 | All analysis data | Professional PDF/Markdown report | No |

**Additional stages:** Session summary (Sonnet), fix suggestion generation (Sonnet), batch screenshot analysis.

**Structured output:** All LLM responses are parsed into Pydantic models with multi-stage fallback: direct parse → JSON extraction → repair (trailing commas, unbalanced brackets, escaped quotes) → retry with clarification prompt.

**Retry logic:** Exponential backoff (1s → 2s → 4s) on rate limits and server errors. Max 3 retries per call.

**Langfuse tracing:** Every API call is traced with study_id, stage, model, token counts for cost analytics and debugging.

### 5.4 Browser Infrastructure

**Dual-mode browser pool:**
- **Browserbase (cloud):** Per-session Chromium provisioned via REST API. Includes auto-CAPTCHA solving, live view URLs for iframe embedding, and cloud scaling.
- **Local Chromium (fallback):** Shared Playwright instances with context isolation. Supports parallel browser processes, persistent profiles, and memory management.

**Hybrid auto-failover (Iteration 5):** If local Chromium crashes N times (configurable threshold), automatically fails over to Browserbase cloud browsers. Monitors memory via psutil to prevent OOM.

**Viewport presets:** Desktop (1920x1080), Laptop (1366x768), Mobile (390x844 with touch), Tablet (768x1024 with touch). Each includes device-specific user agents.

**CDP Screencast streaming (local mode):** Captures JPEG frames from Chrome's compositor at 10fps via Page.startScreencast. Frames published to Redis as binary, forwarded to frontend via binary WebSocket. Frontend decodes off-thread using createImageBitmap() for GPU-accelerated canvas rendering.

**Health checks and auto-restart:** Periodic health monitoring for local browsers with automatic restart on crash detection. Page-count limits per context prevent memory leaks.

### 5.5 Real-Time Progress System

**Dual data path for reliability:**
1. **WebSocket (fast):** Redis PubSub → WebSocket hub → browser. Sub-second latency for step updates.
2. **Polling (reliable fallback):** Durable Redis hash store polled every 1.5s via REST. Survives WebSocket disconnects.

**Live session state store:** Redis hash (`study:{id}:live-sessions`) with 6-hour TTL. Updated on every step. Supports WebSocket reconnection recovery — reconnecting clients receive a full snapshot of current state.

**WebSocket event types:**
- `study:progress` — Overall study percentage and phase
- `session:step` — New step with think-aloud, screenshot URL, emotional state, action, task progress
- `session:complete` — Session finished with total steps
- `session:live_view` — Browserbase live view URL available
- `session:screencast_started` — CDP screencast available
- `session:browser_closed` — Browser session ended
- `session:emotional_shift` — Dramatic emotional state change detected
- `study:analyzing` — Post-session analysis phase
- `study:complete` — Study finished with score, issues count, cost breakdown
- `study:error` — Error notification

### 5.6 Analysis & Insights

**Screenshot analysis (Opus Vision):** Deep UX audit on each unique page. Produces 1-10 scores for: visual clarity, information hierarchy, action clarity, error handling, accessibility. Detects element-level issues mapped to Nielsen's 10 heuristics and WCAG criteria.

**Issue deduplication:** Groups similar issues within a study using string similarity (SequenceMatcher, 70% threshold). Keeps higher-severity version of duplicates.

**Cross-study issue tracking:** Matches issues across prior studies of the same URL domain. Tracks first appearance, recurrence count, and regression detection (issue appeared → fixed → reappeared).

**Issue prioritization:** Multi-factor scoring formula:
- Base severity (critical=40, major=25, minor=10, enhancement=5)
- Personas affected count x 20 (universal issues rank higher)
- Caused task give-up x 50 (blocking issues are critical)
- On landing page x 15 (high-traffic pages)
- On key page (checkout, signup, pricing) x 10
- Times seen x 5 (recurring issues)

**Cross-persona synthesis (Opus):** Aggregates findings from all sessions into: overall UX score (0-100), executive summary, universal issues, persona-specific issues, comparative insights, and ranked recommendations with impact/effort assessment.

### 5.7 Heatmap Generation

**Click aggregation:** Groups all click coordinates by page URL across all personas. Normalizes to viewport dimensions.

**Rendering pipeline:** Pillow-based with NumPy:
1. Create blank image (1920x1080)
2. Draw semi-transparent circles at each click point (radius 30px, opacity 160)
3. Apply Gaussian blur (radius 25px) for heatmap effect
4. Render to lossless PNG

**Frontend canvas overlay:** Renders heatmap PNG over base page screenshot. Responsive via ResizeObserver. Page selector dropdown for multi-page tests. Legend showing density scale.

### 5.8 Report Generation

**Markdown report includes:**
- UX score badge with letter grade (A/B/C/D/F)
- Executive summary
- Methodology description
- Persona overview table (name, completed?, steps, difficulty level)
- AI-generated analysis sections
- Prioritized recommendations table (impact, effort, description)
- Appendix with full issue list

**PDF generation:** Markdown → PDF via WeasyPrint with custom CSS template. Professional formatting with table of contents and page structure.

**Export options:** Download as Markdown (.md) or PDF (.pdf) from the results page.

### 5.9 Session Replay

**Step-by-step playback:**
- Full-screen screenshot viewer with think-aloud bubble overlay
- Navigation controls: First, Prev, Play/Pause, Next, Last
- Keyboard shortcuts: ← → (prev/next), Space (play/pause), Home/End (first/last)
- Autoplay at 2s per step
- Click-to-seek on step timeline
- Step metadata panel (action type, confidence, page URL, emotional state)
- Persona info sidebar

**Video generation:** Stitches session screenshots into animated GIF replay. Optional AI narration overlay (think-aloud text rendered on each frame). Configurable frame duration. Download as GIF.

### 5.10 Comparison & Benchmarking

**Before/after comparison:** Compare two study runs on the same URL. Shows:
- Score delta (improved/regressed/stable)
- Issues fixed (in baseline, not in new run)
- Issues new (in new run, not in baseline)
- Issues persisting (in both)
- AI-generated summary of changes

**Issue matching:** Uses SequenceMatcher string similarity to find corresponding issues across studies.

**Competitive benchmarking:** Run the same personas and tasks against multiple competitor URLs. Aggregates scores, issue counts, task completion rates. Determines winner.

### 5.11 Longitudinal Score Tracking

**Score history per URL:** Tracks every test score over time for each URL tested. API returns data points with scores, timestamps, and trend analysis.

**Trend detection:** Determines if scores are improving, declining, or stable based on moving averages.

**Score delta:** Calculates improvement from first test to latest.

**Frontend visualization:** Recharts AreaChart with gradient fill showing score trend over time. Custom tooltip on hover.

### 5.12 Scheduled & Webhook-Triggered Tests

**Schedule creation:** Define recurring tests with:
- Name, URL, tasks, personas
- Cron expression (presets: daily, weekly, monthly, or custom)
- Automatic webhook secret generation (32-byte URL-safe token)

**Cron execution:** arq cron job checks every minute for due schedules and triggers runs automatically.

**CI/CD webhook integration:** `POST /webhook/deploy/{secret}` triggers a test run. No auth required — security via unique webhook secret. Perfect for post-deploy validation.

**Schedule management:** Pause/resume, manual trigger, edit, delete. Dashboard shows run count, next run time, last study results.

### 5.13 AI Fix Suggestions

**Code-level remediation:** For each UX issue detected, Claude generates:
- Plain-language explanation of the fix
- Actual code snippet implementing the fix
- Programming language identifier

**Stored on the issue:** `fix_suggestion`, `fix_code`, `fix_language` fields on the Issue model.

### 5.14 Cost Tracking & Estimation

**Pre-run estimation:** Before starting a study, the cost estimator predicts API costs based on: number of personas, tasks, estimated steps, and model pricing ($15/$75 per 1M tokens for Opus, $3/$15 for Sonnet). Shows breakdown by pipeline stage.

**Actual cost tracking:** During execution, tracks:
- LLM input/output tokens and API calls
- Browser session time and cost (Browserbase billing)
- Storage (screenshots count and size)
- Total cost in USD
- Savings vs cloud mode (if using local browsers)

**Database persistence:** 8 cost columns on the studies table (migration 004): `llm_input_tokens`, `llm_output_tokens`, `llm_total_tokens`, `llm_api_calls`, `llm_cost_usd`, `browser_mode`, `browser_cost_usd`, `total_cost_usd`. Queryable via API after study completion.

### 5.15 Emotional Journey Analysis

**Per-persona emotional arc:** Tracks emotional state at every step (confident, curious, neutral, hesitant, confused, frustrated, satisfied, anxious). Detects dramatic emotional shifts (intensity delta > 3) and publishes events.

**Peak frustration detection:** Identifies the step where each persona was most frustrated.

**Scroll depth analysis:** Tracks how far each persona scrolled on each page (max depth in pixels and percentage).

### 5.16 Site Pre-Crawling (Firecrawl Integration)

Before personas navigate, Firecrawl pre-crawls the target site to discover:
- All accessible pages (up to 50)
- Page titles, descriptions, headings
- Key page identification (landing, signup, login, pricing, docs)
- Navigation links between pages

This "sitemap" is injected into the navigator's context, giving personas a map of the site structure. Improves task completion rates and reduces wasted steps.

### 5.17 Reverse Proxy for Testing

Reverse proxy endpoint (`GET /api/v1/proxy?url=...`) that:
- Strips anti-framing headers (X-Frame-Options, CSP frame-ancestors)
- Injects `<base>` tag for relative URL resolution
- Enables any website to be embedded in iframe for preview
- SSRF protection: blocks private/reserved IP ranges
- Max response size: 10MB, timeout: 15s

---

## 6. Frontend Highlights

### 6.1 Live Running Page

The most technically impressive page. Shows real-time progress for all personas in parallel:

- **Persona progress cards** with avatar, name, behavioral attributes (tech literacy bars, patience bars), accessibility needs tags, frustration triggers
- **Tabbed view per persona:** Steps tab (live timeline) | Browser tab (live screenshots)
- **Live step timeline:** Vertical scrolling list with action-type icons (click, type, scroll, navigate), color-coded circles, mood emoji, relative timestamps, expandable think-aloud text, ping animation on latest step, auto-scroll tracking
- **Think-aloud bubble:** Typewriter character-by-character text reveal (20ms per char) with emotional state emoji
- **Screenshot preloading:** New screenshots are preloaded via `new Image()` before swapping to prevent white flash between frames
- **Progress indicators:** 20-bar mini chart, percentage, phase label with pulse animation
- **Terminal log panel:** Collapsible terminal-style log viewer with color-coded entries (error=red, warn=yellow, info=gray), timestamps, auto-scroll
- **Browser mode badge:** Shows Local/Cloud with icon in header
- **Cost display on completion:** Total USD, API call count, savings vs cloud

### 6.2 Study Setup Wizard

- **New/Rerun toggle:** Start fresh or rerun a previous test
- **URL input** with bookmark dropdown (localStorage-backed favorites)
- **Task editor:** Up to 3 tasks with add/remove, placeholder suggestions
- **Device toggle:** Desktop/Mobile with icons
- **Browser engine toggle:** Local/Cloud with description ("Uses local Chromium — free, no CAPTCHA solving" vs "Uses Browserbase — live view, auto CAPTCHA solving")
- **Persona selector:** Paginated grid (4 per page), category filter, custom generation via text input with real-time LLM generation
- **Schedule builder:** Toggle for recurring runs, cron presets (daily, weekly, monthly, custom), schedule name
- **Website preview:** Live iframe preview of the target URL in device mockup
- **Cost estimate:** Shows estimated cost and duration based on selections

### 6.3 Test Dashboard

- **URL-grouped history:** Tests grouped by website URL with collapsible rows
- **Score trend charts:** Recharts AreaChart per URL group showing score over time
- **Status filters:** Filter by complete/running/failed/setup
- **Comparison mode:** Select 2 tests → floating action bar → side panel with score delta, issues fixed/new/persisting, AI summary
- **Schedule management panel:** Create, pause/resume, trigger, delete schedules

### 6.4 Session Replay

- **Full screenshot viewer** with think-aloud overlay
- **Keyboard-driven navigation** (←→ Space Home End)
- **Step timeline sidebar** with emotion icons and think-aloud preview
- **Video generation** with optional narration, download as GIF
- **Step metadata** (action type, selector, confidence score, page URL)

### 6.5 Heatmap Visualization

- Canvas overlay with Gaussian blur heatmap
- Page selector for multi-page tests
- Click count statistics
- Responsive layout via ResizeObserver

### 6.6 Results Page

- **Score cards:** Overall score (0-100, color-coded), issues found (highlights critical), task completion %, personas tested
- **Executive summary:** AI-generated markdown
- **Persona comparison grid:** Session progress by persona
- **Recommendation list:** Prioritized by impact/effort
- **Issue list:** Filterable by severity, with "View in Replay" links
- **Export:** Markdown and PDF download

---

## 7. Performance Optimizations

| Optimization | Before | After | Savings |
|-------------|--------|-------|---------|
| Skip persona LLM generation | ~19s Opus API call per persona | <1ms template conversion | **~19s per persona** |
| Background step recording | Blocking save+publish per step | asyncio background task | **~0.5-1s per step** |
| Model routing (Sonnet for nav) | All Opus (~16s per step) | Sonnet for navigation (~8-10s) | **~6s per step** |
| Screenshot preloading | White flash between frames | Seamless swap via Image preload | **Visual quality** |
| Dual data path (WS + polling) | WebSocket-only (fragile) | WS + 1.5s polling fallback | **Reliability** |
| JPEG screenshots (opt-in) | PNG only | JPEG 85% quality | **60-80% storage** |
| Batch screenshot analysis | Individual API calls | Multi-image single call | **Fewer API calls** |

---

## 8. API Surface

**40+ REST endpoints across 12 resource types:**

| Category | Endpoints | Key Features |
|----------|-----------|-------------|
| Studies | 7 | CRUD, run, status poll, live state, cost estimate |
| Sessions & Steps | 4 | List, detail, paginated steps |
| Issues & Insights | 3 | Filtered issues, synthesized insights, heatmap data |
| Reports | 3 | Metadata, PDF download, Markdown download |
| Personas | 4 | Templates, custom generation, detail |
| Comparison | 1 | Before/after study diff |
| Fixes | 2 | Generate AI fix suggestions, list fixes |
| Score History | 2 | Tracked URLs, score trends |
| Schedules | 6 | CRUD, trigger, webhook |
| Videos | 4 | Generate, download, list |
| Emotional Journey | 1 | Per-persona emotional arc |
| Scroll Depth | 1 | Scroll behavior analysis |
| Health | 2 | API + browser pool health |
| Proxy | 1 | Anti-framing reverse proxy |
| WebSocket | 2 | Study progress, CDP screencast |

---

## 9. Database Schema

**11 tables, 4 migrations, UUID primary keys, JSONB for flexible data:**

- **studies** — URL, status (setup → running → analyzing → complete → failed), overall score, executive summary, 8 cost tracking columns
- **tasks** — Description, order index (max 3 per study)
- **personas** — Template reference, behavioral profile (JSONB), is_custom flag
- **sessions** — Persona x task combo, status, total steps, task completed, emotional arc (JSONB)
- **steps** — Step number, page URL/title, screenshot path, think-aloud, action type/selector/value, confidence, task progress, emotional state, click coordinates, viewport dimensions, scroll metrics
- **issues** — Severity, Nielsen heuristic, WCAG criterion, recommendation, priority score, fix suggestions, cross-study tracking (first_seen, times_seen, is_regression)
- **insights** — Type (universal/persona_specific/comparative/recommendation), impact, effort, personas affected, evidence
- **persona_templates** — 20+ pre-built templates with name, emoji, category, default profile (JSONB)
- **schedules** — Cron expression, webhook secret, status, run count, next run time
- **session_videos** — Video path, status, frame count, duration, narration flag

---

## 10. Development & Deployment

**One-command setup:**
```bash
make dev-all    # Starts Docker infra + backend + worker + frontend
```

**Docker Compose:** PostgreSQL 16, Redis 7, backend, worker. Local mode adds Chromium in container with memory limits (4GB backend, 6GB worker, 2GB shared memory for Chrome).

**Testing:** pytest + pytest-asyncio for backend (unit + integration). Vitest + React Testing Library for frontend.

**CI/CD:** GitHub Action (`mirror-test`) for automated UX testing in pipelines. Inputs: URL, tasks, personas, fail-below threshold.

---

## 11. Key Technical Decisions

1. **Python backend (not Node):** Playwright Python + Anthropic Python SDK + asyncio = tightest integration. NumPy/Pillow for heatmaps.
2. **PostgreSQL over SQLite:** Multi-connection for concurrent study runs. JSONB for flexible persona profiles.
3. **arq over Celery:** Lightweight, native async, Redis-based. Avoids Celery's complexity.
4. **Model routing (Opus + Sonnet):** Opus for quality (analysis, synthesis, reports). Sonnet for speed (navigation). Configurable per stage.
5. **Browserbase for cloud browsers:** Managed infrastructure, live view URLs, auto-CAPTCHA solving. Local fallback for development.
6. **Hybrid auto-failover:** Local crashes → automatic cloud failover. Best of both worlds.
7. **Cloudflare R2 for storage:** S3-compatible with zero egress fees. Critical for screenshot-heavy replays.
8. **Redis for everything real-time:** PubSub for WebSocket distribution, hash store for durable live state, arq for job queue.
9. **Firecrawl for site reconnaissance:** Pre-navigation sitemap gives personas a "map" of the site.
10. **Langfuse for LLM observability:** Token tracking, cost per study, latency monitoring across 200+ API calls per study.

---

## 12. What Makes Mirror Special

1. **Real browsers, not simulations.** Personas navigate actual Chromium instances via Playwright. Every click, scroll, and page load is real.

2. **Think-aloud narration.** Each persona generates a running inner monologue ("I'm looking for the pricing page... this navigation is confusing..."), exactly like a real usability test participant.

3. **Emotional state tracking.** The AI tracks emotional state per step (confident → confused → frustrated → satisfied), enabling emotional arc analysis and frustration detection.

4. **Cross-persona comparative insights.** When 3 personas all struggle with the same element, that's a universal issue. When only the low-tech persona struggles, that's an accessibility concern. Mirror distinguishes between these automatically.

5. **Live progress monitoring.** Watch personas navigate in real-time with think-aloud bubbles, screenshot updates, and step-by-step timeline — like watching a real user test through a one-way mirror.

6. **End-to-end in one platform.** Setup → execution → analysis → report → export → comparison → scheduling — no tool-switching, no manual analysis, no report writing.

7. **$0.50 per test vs $12,000.** 99.99% cost reduction. Run tests on every deploy, not once a quarter.

8. **5 minutes vs 4 weeks.** From URL paste to PDF report with scored issues and prioritized recommendations.

9. **Regression detection.** Track issues across runs. Know instantly if a deployed fix actually worked or if old issues returned.

10. **CI/CD integration.** GitHub Action + webhook support. Fail the build if UX score drops below threshold. Automated quality gates.

---

## 13. Metrics

| Metric | Value |
|--------|-------|
| Total backend Python | ~10,000 lines |
| Total frontend TypeScript | ~3,000+ lines |
| React components | 79 |
| Custom hooks | 13 |
| Pages | 14 |
| REST API endpoints | 40+ |
| WebSocket endpoints | 2 |
| Database tables | 11 |
| Database migrations | 4 |
| Pre-built persona templates | 20+ |
| LLM pipeline stages | 5 (+ 2 additional) |
| Docker services | 6 |
| Makefile targets | 14 |
| Cost per test | ~$0.50 |
| Time per test | ~5 minutes |
| PRs merged | 7 |
| Development time | 2 weeks |
