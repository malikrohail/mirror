# Mirror -- Architecture Overview

Mirror is an AI-powered usability testing platform. Users paste a URL, define tasks, select AI personas, and Mirror launches real browsers where each persona navigates the live site. Claude analyzes every screenshot, generates think-aloud narration, detects UX issues, and produces a comparative insight report. Traditional user testing costs $12,000+ and takes weeks. Mirror delivers 80% of those insights in under 5 minutes.

---

## 1. System Overview

Mirror follows a three-layer architecture: a Next.js frontend for the user interface, a FastAPI backend for orchestration and data access, and an async worker layer for the computationally intensive browser automation and AI analysis. Redis pub/sub decouples the layers, allowing workers to emit real-time progress without knowing anything about connected WebSocket clients.

```
                           BROWSER
                             |
                     --------+--------
                     |               |
                   REST           WebSocket
                 (queries)       (live updates)
                     |               |
+--------------------+---------------+----------------------------+
|                    FRONTEND  (Next.js 16)                       |
|                                                                 |
|  Dashboard  |  Study Setup  |  Live Progress  |  Results        |
|  Session Replay  |  Heatmap  |  Report  |  Persona Library      |
|                                                                 |
|  State: Zustand (UI) + TanStack Query (server)                  |
|  Styling: Tailwind CSS v4 + shadcn/ui                           |
+------------------------------+----------------------------------+
                               |
                    Next.js rewrites proxy
                     /api/v1/* --> :8000
                               |
+------------------------------+----------------------------------+
|                    BACKEND API  (FastAPI)                        |
|                                                                 |
|  +-------------+  +----------------+  +----------------------+  |
|  | REST API    |  | WebSocket Hub  |  | Study Orchestrator   |  |
|  | /api/v1/*   |  | subscribe to   |  | enqueue jobs to arq  |  |
|  |             |  | Redis channels |  |                      |  |
|  +------+------+  +-------+--------+  +----------+-----------+  |
|         |                 |                       |              |
|  +------+-----------------+-----------------------+-----------+  |
|  |                   SERVICE LAYER                            |  |
|  |  StudyService  PersonaService  SessionService  ReportSvc   |  |
|  +------+----------------------------------------------------+  |
|         |                                                       |
|  +------+----------------------------------------------------+  |
|  |                   DATA LAYER                               |  |
|  |  PostgreSQL          Redis            FileStorage          |  |
|  |  (SQLAlchemy async)  (cache + pubsub) (local / R2)        |  |
|  +-----------------------------------------------------------+  |
+------------------------------+----------------------------------+
                               |
                         arq job queue
                          (Redis-based)
                               |
+------------------------------+----------------------------------+
|                    WORKER LAYER  (arq)                           |
|                                                                  |
|  +------------------------------------------------------------+ |
|  | NAVIGATION ENGINE                                           | |
|  | Per-persona agent loop (N personas in parallel):            | |
|  | PERCEIVE -> THINK -> ACT -> RECORD                          | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  +------------------------------------------------------------+ |
|  | ANALYSIS ENGINE                                             | |
|  | Screenshot Analyzer  |  Cross-Persona Synthesizer           | |
|  | Heatmap Generator    |  Report Builder (PDF + Markdown)     | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  +------------------------------------------------------------+ |
|  | PERSONA ENGINE                                              | |
|  | 20+ pre-built templates  |  Custom generation via Claude    | |
|  | Natural language -> PersonaProfile JSON                     | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  +------------------------------------------------------------+ |
|  | BROWSER POOL                                                | |
|  | Browserbase (cloud Chromium via CDP)                         | |
|  | Local Playwright fallback for development                   | |
|  +------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

### Why Three Layers?

Separating the API server from the worker layer is a deliberate choice. Browser sessions are long-running (30+ steps, up to 10 minutes), IO-bound, and unpredictable. If navigation ran inside the FastAPI process, a single crashed Chromium instance could take down the entire API. The arq worker pool isolates this risk: workers can crash and restart independently without affecting API availability or WebSocket connections.

Redis sits at the center as the integration bus. It serves three roles simultaneously: job queue (arq), pub/sub channel (real-time updates), and cache (session metadata). This means the API server never needs to poll workers for status -- updates flow through Redis the instant they happen.

---

## 2. Data Flow -- What Happens When You Click "Run Study"

The full lifecycle of a study, from creation to final report, follows a strict state machine. Each transition triggers specific subsystems.

```
User clicks          API validates        Orchestrator         Workers launch        Analysis
"Run Study"          and persists         dispatches jobs      parallel sessions     engines run
     |                    |                    |                    |                    |
     v                    v                    v                    v                    v

 +--------+         +---------+         +-----------+         +-----------+         +-----------+
 | SETUP  | ------> | RUNNING | ------> | RUNNING   | ------> | RUNNING   | ------> | ANALYZING |
 |        |  POST   |         |  arq    | (workers  |  done   |           |  all    |           |
 | Study  |  /run   | Study   |  enq    | navigate) |         | Sessions  |  done   | Deep UX   |
 | config |         | status  |         |           |         | complete  |         | analysis  |
 +--------+         +---------+         +-----------+         +-----------+         +-----------+
                                                                                         |
                                                                                         v
                                                                                   +-----------+
                                                                                   | COMPLETE  |
                                                                                   |           |
                                                                                   | Score,    |
                                                                                   | issues,   |
                                                                                   | report    |
                                                                                   +-----------+
```

**Step by step:**

1. **POST /api/v1/studies** -- The frontend sends the target URL, task descriptions, and selected persona IDs. The API creates `Study`, `Task`, and `Persona` records in PostgreSQL. Study status: `setup`.

2. **POST /api/v1/studies/{id}/run** -- The API validates the study configuration, creates one `Session` record per persona-task combination, transitions the study to `running`, and enqueues a job to the arq worker pool.

3. **Orchestrator picks up the job** -- The study orchestrator (running inside a worker process) fans out: it creates one asyncio task per session, each receiving its own Playwright browser instance. Sessions run in parallel, bounded by `MAX_CONCURRENT_SESSIONS` (default: 5).

4. **Navigation loops execute** -- Each persona navigates the site in its own browser. At every step, the agent loop runs: capture screenshot, send to Claude for reasoning, execute the decided action, record the step data. Workers publish each step to a Redis channel as it completes.

5. **All sessions finish** -- The orchestrator waits for all sessions to complete (or fail/give-up). Study transitions to `analyzing`.

6. **Analysis pass runs** -- The analysis engine makes a second pass over all captured screenshots with Claude Opus for deeper UX evaluation. The synthesizer correlates issues across personas. The heatmap generator aggregates click coordinates. The report builder produces structured Markdown and PDF output.

7. **Study completes** -- The study record is updated with the overall usability score, executive summary, and issue counts. A `study:complete` event is published to Redis. Study status: `complete`.

---

## 3. Real-Time Updates -- How Live Progress Reaches the Browser

During a study run, users see a live view: each persona's current screenshot, think-aloud narration, emotional state, and task progress -- all updating in real time. Here is how data flows from a worker process to a React component.

```
WORKER PROCESS                    REDIS                      API SERVER                  BROWSER
(arq, one per session)           (pub/sub)                  (FastAPI)                   (Next.js)

  Navigator completes             Channel:                   WebSocket Hub               React
  step 8 for                      study:{id}                 subscribed to               component
  "Sarah, 68, retired"            receives msg               study:{id}                  re-renders
       |                              |                           |                         |
       |   PUBLISH to Redis           |                           |                         |
       +----------------------------->|                           |                         |
       |                              |   forward to              |                         |
       |                              |   all subscribers         |                         |
       |                              +-------------------------->|                         |
       |                              |                           |   send JSON frame       |
       |                              |                           +------------------------>|
       |                              |                           |                         |
       |                              |                           |   { type: "session:step"|
       |                              |                           |     persona: "Sarah"    |
       |                              |                           |     step: 8             |
       |                              |                           |     think_aloud: "..."  |
       |                              |                           |     screenshot_url: ".." |
       |                              |                           |     emotional_state:    |
       |                              |                           |       "confused" }      |
```

**Key design properties:**

- **Workers are stateless publishers.** They write to Redis channels and never maintain WebSocket connections. This means workers can scale horizontally without coordination.

- **The WebSocket hub is a thin relay.** It subscribes to the relevant Redis channel when a client connects, and unsubscribes when they disconnect. No business logic lives here.

- **The frontend subscribes once per study.** A single WebSocket connection receives updates for all personas in that study. The Zustand store dispatches updates to the correct persona panel based on `session_id`.

- **Graceful degradation.** If the WebSocket drops, the frontend falls back to polling `GET /api/v1/studies/{id}/status`. TanStack Query handles this transparently with its refetch interval.

---

## 4. The Navigation Agent -- PERCEIVE / THINK / ACT / RECORD

Each persona session runs an autonomous agent loop. The agent controls a real browser and decides what to do next based on what it sees, just like a human user would.

```
                    +------------------------------------------+
                    |          NAVIGATION AGENT LOOP            |
                    |          (one per persona session)        |
                    +------------------------------------------+
                                       |
                                       v
                    +------------------------------------------+
                    |              1. PERCEIVE                  |
                    |                                          |
                    |  - Capture full-page screenshot (PNG)    |
                    |  - Extract accessibility tree (a11y)     |
                    |  - Record current URL and page title     |
                    |  - Note viewport dimensions              |
                    +--------------------+---------------------+
                                         |
                                         v
                    +------------------------------------------+
                    |              2. THINK                     |
                    |                                          |
                    |  Claude receives:                        |
                    |    - Screenshot (vision)                 |
                    |    - Accessibility tree (structured)     |
                    |    - Persona profile (who am I?)         |
                    |    - Task description (what am I doing?) |
                    |    - Step history (what have I tried?)   |
                    |                                          |
                    |  Claude returns:                         |
                    |    - Think-aloud narration               |
                    |    - Emotional state (confident/confused/|
                    |      frustrated/delighted/neutral)       |
                    |    - Decided action (click/type/scroll/  |
                    |      navigate/give_up)                   |
                    |    - Action target (CSS selector/coords) |
                    |    - Task progress estimate (0-100%)     |
                    |    - UX issues spotted (if any)          |
                    +--------------------+---------------------+
                                         |
                                         v
                    +------------------------------------------+
                    |              3. ACT                       |
                    |                                          |
                    |  Playwright executes the decided action: |
                    |    click(selector) | type(selector, text)|
                    |    scroll(direction) | navigate(url)     |
                    |    give_up(reason)                       |
                    |                                          |
                    |  Waits for network idle + DOM stable     |
                    +--------------------+---------------------+
                                         |
                                         v
                    +------------------------------------------+
                    |              4. RECORD                    |
                    |                                          |
                    |  - Save screenshot to storage (R2/local) |
                    |  - Insert Step row into PostgreSQL       |
                    |  - Insert any Issues found               |
                    |  - Publish step event to Redis           |
                    |  - Update session progress               |
                    +--------------------+---------------------+
                                         |
                              +----------+----------+
                              |                     |
                         task complete?         max steps?
                         or gave up?            (default: 30)
                              |                     |
                         yes  |                yes  |
                              v                     v
                           [STOP]               [STOP]
                              |                     |
                         no   |                no   |
                              |                     |
                              +----------+----------+
                                         |
                                         v
                                   [LOOP BACK TO
                                    PERCEIVE]
```

**Why this loop structure matters:**

- **Vision-first perception.** The agent sees exactly what a human user would see: a rendered screenshot. The accessibility tree provides structured element data, but the screenshot drives decision-making. This catches visual UX issues (overlapping elements, poor contrast, misleading layouts) that a DOM-only approach would miss.

- **Persona-conditioned reasoning.** The same page looks different to a tech-savvy 25-year-old and a 68-year-old retiree. The persona profile is injected into every THINK prompt, so Claude naturally generates different reactions, different confusion points, and different navigation paths.

- **Bounded execution.** Every session has a hard cap on steps (`MAX_STEPS_PER_SESSION`, default 30) and a timeout (`STUDY_TIMEOUT_SECONDS`, default 600s). If a persona visits the same page three consecutive times, the stuck-detection heuristic triggers a `give_up` action. The study continues with the remaining personas.

- **Parallel but independent.** Each persona gets its own browser instance, its own asyncio task, and its own agent loop. No shared state between personas. This means five personas navigate simultaneously without interference.

---

## 5. Two-Pass Analysis -- Why Navigation and Analysis Are Separate

Mirror makes two distinct passes over the data, each optimized for a different goal.

```
PASS 1: NAVIGATION (real-time, speed-optimized)
================================================

  Model: Claude Sonnet (fast, cost-effective)
  Goal:  Make the next navigation decision quickly
  Time:  ~2-3 seconds per step

  What it produces:
    - Think-aloud narration for each step
    - Action decisions (click, type, scroll)
    - Quick UX issue flags (surface-level)
    - Emotional state tracking
    - Task progress estimates

  What it does NOT do:
    - Deep visual accessibility audits
    - Cross-page pattern analysis
    - Nielsen heuristic evaluation
    - WCAG compliance checking


PASS 2: DEEP ANALYSIS (post-session, quality-optimized)
========================================================

  Model: Claude Opus (deep reasoning, comprehensive)
  Goal:  Extract every possible UX insight
  Time:  ~30-60 seconds per session (batched)

  What it produces:
    - Detailed per-screenshot UX audit
    - Nielsen's 10 heuristics evaluation
    - WCAG criterion references
    - Severity classifications (critical/major/minor)
    - Specific remediation recommendations

  Then, the SYNTHESIS stage:
    - Cross-persona issue correlation
    - Universal vs. persona-specific issue classification
    - Impact/effort prioritization matrix
    - Executive summary with usability score
    - Heatmap generation (aggregate click data)
    - PDF and Markdown report
```

**Why two passes instead of one?**

| Concern | Navigation Pass | Analysis Pass |
|---------|----------------|---------------|
| **Latency** | Must be fast (~2s) to feel real-time | Can take minutes; user sees a progress bar |
| **Cost** | Runs 15-30 times per session; Sonnet is ~10x cheaper | Runs once per session; Opus quality justifies cost |
| **Context** | Only sees current step + recent history | Sees the entire session, all personas, full picture |
| **Accuracy** | Good enough for "what should I click next?" | Thorough enough for "what UX issues exist here?" |

A single-pass architecture would force a choice: use a fast model and miss deep insights, or use a thorough model and make the live view painfully slow. The two-pass design gives users real-time narration during the run and comprehensive analysis when it finishes.

---

## 6. Storage and Data Model

### PostgreSQL Schema

All tables use UUID primary keys and `created_at`/`updated_at` timestamps. The schema is normalized with clear foreign key relationships, but uses JSONB columns where flexibility is needed (persona profiles, emotional arcs, evidence arrays).

```
studies
  |-- id (UUID, PK)
  |-- url, starting_path
  |-- status: setup | running | analyzing | complete | failed
  |-- overall_score, executive_summary
  |
  +-- tasks (1:N)
  |     |-- description, order_index
  |
  +-- personas (1:N)
  |     |-- template_id (FK to persona_templates)
  |     |-- profile (JSONB) -- full persona definition
  |     |-- is_custom
  |
  +-- sessions (1:N, one per persona x task)
  |     |-- persona_id (FK), task_id (FK)
  |     |-- status: pending | running | complete | failed | gave_up
  |     |-- total_steps, task_completed
  |     |-- summary, emotional_arc (JSONB)
  |     |
  |     +-- steps (1:N, ordered by step_number)
  |     |     |-- page_url, page_title, screenshot_path
  |     |     |-- think_aloud, action_type, action_selector
  |     |     |-- confidence, task_progress, emotional_state
  |     |     |-- click_x, click_y, viewport_width, viewport_height
  |     |
  |     +-- issues (1:N, discovered during navigation + analysis)
  |           |-- element, description, severity
  |           |-- heuristic (Nielsen's), wcag_criterion
  |           |-- recommendation, page_url
  |
  +-- insights (1:N, generated during synthesis)
        |-- type: universal | persona_specific | comparative | recommendation
        |-- title, description, severity
        |-- impact, effort, rank
        |-- personas_affected (JSONB), evidence (JSONB)
```

### Redis (Three Roles)

```
1. JOB QUEUE (arq)
   Key pattern: arq:queue:default
   Purpose:     Study run jobs, analysis jobs

2. PUB/SUB CHANNELS
   Channel pattern: study:{study_id}
   Purpose:         Real-time step updates, session completions,
                    study status transitions

3. CACHE
   Key pattern: session:{session_id}:meta
   Purpose:     Hot session metadata for WebSocket hub
                (avoids DB queries on every step event)
```

### File Storage (Abstracted)

Screenshots and generated reports live in file storage behind an abstract interface. The same code runs against local filesystem in development and Cloudflare R2 (S3-compatible) in production.

```
Storage Interface
  |
  +-- LocalFileStorage (development)
  |     Base path: ./data/studies/
  |
  +-- R2FileStorage (production)
        Bucket: mirror-screenshots
        Endpoint: Cloudflare R2 (zero egress fees)

File layout:
  {study_id}/
    sessions/
      {session_id}/
        steps/
          step_001.png     -- screenshot
          step_001.json    -- step metadata
    heatmaps/
      {page_url_hash}.png  -- generated heatmap overlay
    analysis.json           -- full analysis results
    report.pdf              -- generated PDF report
    report.md               -- generated Markdown report
```

**Why Cloudflare R2?** A single study with 5 personas averaging 20 steps each generates 100 screenshots. Session replay loads all of them sequentially. With S3, egress costs scale linearly with replays. R2 has zero egress fees -- the same S3-compatible API, but replays are free no matter how many times users review results.

---

## Design Decisions at a Glance

| Decision | Rationale |
|----------|-----------|
| Python backend (not Node) | Playwright Python + Anthropic SDK + asyncio = tightest integration. Pillow for heatmaps. |
| PostgreSQL over SQLite | Concurrent session writes. JSONB for flexible schemas. Async via asyncpg. |
| arq over Celery | Lightweight, native async, Redis-based. No broker complexity. |
| Browserbase for browsers | Managed cloud Chromium via CDP. No local memory leaks or scaling headaches. |
| Firecrawl for recon | Pre-crawl target site to build a sitemap. Smarter navigation, fewer wasted steps. |
| Langfuse for LLM observability | 200+ API calls per study. Need visibility into tokens, costs, latency per pipeline stage. |
| WebSocket + Redis pub/sub | Workers never hold WebSocket connections. Scales horizontally. |
| Separate navigation/analysis | Real-time speed (Sonnet) during the run. Deep quality (Opus) after it finishes. |
| Cloudflare R2 for storage | S3-compatible, zero egress. Critical for screenshot-heavy session replays. |
