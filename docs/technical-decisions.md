# Technical Decisions

Mirror makes 12 deliberate architectural choices. Each section explains what was chosen, what alternatives were considered, why this path was taken, and what the tradeoff is.

---

## 1. Python Backend over Node.js

**Decision:** Python 3.12 with asyncio as the backend language.

**Alternatives considered:** Node.js (TypeScript), Go.

**Why this choice:**
- Playwright Python + Anthropic Python SDK + asyncio gives the tightest integration across our three core dependencies with no interop friction.
- NumPy and Pillow power heatmap generation (gaussian blur over aggregated click coordinates) — no equivalent exists in the Node ecosystem at this quality level.
- The browser automation and AI pipeline are IO-bound (waiting on browser actions, API responses), which is exactly where Python's asyncio excels.

**Tradeoff:** Two languages in the stack (Python backend, TypeScript frontend). Mitigated by clear API contracts and no shared code between layers.

---

## 2. FastAPI over Django / Flask

**Decision:** FastAPI as the web framework.

**Alternatives considered:** Django (+ Django REST Framework), Flask (+ Quart for async).

**Why this choice:**
- Native async from the ground up — no bolted-on async support. Every handler, middleware, and dependency is async-native, matching our async Playwright and Anthropic clients.
- Auto-generated OpenAPI documentation means our REST + WebSocket contract stays in sync with the code without manual maintenance.
- Pydantic validation and dependency injection reduce boilerplate. Request/response schemas are validated at the framework level, not in business logic.

**Tradeoff:** No built-in admin panel or ORM (unlike Django). We use SQLAlchemy independently, which means more setup but also more control over query patterns.

---

## 3. PostgreSQL over SQLite / MongoDB

**Decision:** PostgreSQL 16 with async access via asyncpg.

**Alternatives considered:** SQLite (simpler setup), MongoDB (flexible schema).

**Why this choice:**
- Multi-connection support is essential for concurrent study runs — 5 persona sessions writing step data simultaneously. SQLite's single-writer lock would serialize everything.
- JSONB columns store flexible persona profiles, emotional arcs, and evidence arrays without sacrificing the relational integrity of the study -> session -> step hierarchy.
- asyncpg provides true async database access (not thread-pool wrappers), matching our fully async architecture.

**Tradeoff:** Requires running a database server even in development. Docker Compose handles this, but it is heavier than SQLite's zero-config file.

---

## 4. arq over Celery

**Decision:** arq (async Redis queue) for background job processing.

**Alternatives considered:** Celery, Dramatiq, RQ.

**Why this choice:**
- Native async — arq workers run an asyncio event loop, so Playwright browser sessions and Anthropic API calls work naturally without thread-pool hacks.
- Celery's process-based execution model (prefork) clashes with async Playwright. Running Playwright in Celery requires either asyncio.run() per task (losing concurrency) or gevent (fragile with Playwright's CDP protocol).
- Minimal footprint — arq is ~500 lines of code, uses Redis as both broker and result store. No RabbitMQ, no separate result backend, no complex routing topology.

**Tradeoff:** Less mature ecosystem. No built-in task chains, periodic tasks, or monitoring dashboard. We handle orchestration in our own StudyOrchestrator class.

---

## 5. Model Routing (Opus + Sonnet + Haiku)

**Decision:** Route different pipeline stages to different Claude models based on reasoning depth requirements.

**Alternatives considered:** Single model for everything (Opus only), single cheaper model (Sonnet only).

**Why this choice:**
- A single study makes 200+ LLM API calls across 5 pipeline stages. Using Opus for everything would cost ~$15-20 per study. Routing saves 60-70%, bringing cost to ~$4-6 per study.
- Persona generation, insight synthesis, and report generation require deep reasoning (Opus). Per-step navigation decisions and screenshot analysis need speed and are acceptable at Sonnet/Haiku quality.
- Model assignment is configurable per pipeline stage via environment variables, so we can rebalance cost vs. quality without code changes.

**Tradeoff:** More complex prompt engineering — each model has different capabilities and failure modes. Navigation prompts tuned for Sonnet may underperform if swapped to Haiku without adjustment.

---

## 6. Two-Pass Analysis (Navigate, Then Analyze)

**Decision:** Separate the navigation pass (real-time browsing) from the analysis pass (post-session deep review).

**Alternatives considered:** Single-pass (analyze during navigation), analysis only after all sessions complete.

**Why this choice:**
- During navigation, latency matters — the persona needs to decide its next action in under 3 seconds to feel real-time. Deeper UX analysis would slow each step to 8-10 seconds.
- The post-session analysis pass uses Opus with the full context of what happened, catching issues that speed-optimized navigation misses (e.g., subtle color contrast problems, inconsistent interaction patterns).
- The two passes produce complementary data: navigation captures behavioral signals (where users click, how long they hesitate), analysis captures evaluative signals (what is actually wrong with the design).

**Tradeoff:** Doubles the number of LLM calls for screenshot analysis. Mitigated by using the cheaper model during navigation and only applying Opus in the analysis pass.

---

## 7. Cloudflare R2 over AWS S3

**Decision:** Cloudflare R2 for screenshot and report storage.

**Alternatives considered:** AWS S3, Google Cloud Storage, local filesystem only.

**Why this choice:**
- S3-compatible API means zero migration effort — our storage interface uses boto3, and switching between S3 and R2 is a config change.
- Zero egress fees. Session replays load 15-30 screenshots per session, and heatmap views load overlays for every page. With S3, egress costs would scale linearly with usage. R2 eliminates this entirely.
- An abstract storage interface (`file_storage.py`) provides a local filesystem fallback for development, so contributors do not need cloud credentials to run Mirror locally.

**Tradeoff:** R2's consistency model is eventually consistent for overwrite PUTs (S3 is strongly consistent). Not a concern for us since screenshots are write-once, never overwritten.

---

## 8. Browserbase over Local Playwright

**Decision:** Browserbase for managed headless browser infrastructure in production.

**Alternatives considered:** Self-hosted Playwright browsers (Docker), AWS Lambda with Chromium layers.

**Why this choice:**
- Local Chromium instances leak memory over long sessions (30+ navigation steps), crash unpredictably under concurrent load, and require careful lifecycle management. Browserbase handles all of this.
- Same Playwright code works locally and against Browserbase — we connect via Chrome DevTools Protocol (CDP). No code changes between development (local Chromium) and production (Browserbase).
- Stagehand SDK provides an AI-powered fallback for element selection when standard Playwright selectors fail on dynamic SPAs.

**Tradeoff:** External dependency with per-minute pricing. Local Playwright remains the default for development, and the system degrades gracefully if Browserbase is unavailable.

---

## 9. Redis Pub/Sub for Real-Time Updates

**Decision:** Redis pub/sub channels for streaming study progress from workers to the frontend via WebSocket.

**Alternatives considered:** Direct WebSocket from workers, Server-Sent Events (SSE), polling.

**Why this choice:**
- Decouples workers from WebSocket connections. Workers publish step updates to a Redis channel (`study:{id}:progress`) without knowing or caring how many clients are listening.
- The WebSocket hub subscribes to relevant channels and forwards messages to connected browsers. This means workers can run on different machines than the API server.
- Redis is already in the stack (arq uses it as a job queue), so there is no additional infrastructure to manage.

**Tradeoff:** Redis pub/sub is fire-and-forget — if a client disconnects and reconnects, it misses messages published during the gap. We handle this by providing a REST endpoint for current study status that clients poll on reconnect.

---

## 10. Firecrawl for Site Reconnaissance

**Decision:** Pre-crawl the target site with Firecrawl before personas begin navigating.

**Alternatives considered:** No pre-crawling (navigate blind), custom Scrapy spider, Playwright-based crawling.

**Why this choice:**
- Firecrawl discovers the site's page structure, extracts content, and builds a sitemap in seconds. This gives the navigation engine a "map" so personas make informed decisions about where to go next, reducing wasted steps.
- Without reconnaissance, personas frequently revisit the same pages, miss important sections, or spend steps on irrelevant navigation — burning through the step budget (max 30 steps per session) on exploration instead of task completion.
- Firecrawl handles JavaScript-rendered content, SPAs, and dynamic routing that a simple HTTP crawler would miss.

**Tradeoff:** Adds 5-15 seconds of setup time before navigation begins and requires an external API key. The system falls back to blind navigation if Firecrawl is unavailable.

---

## 11. Next.js App Router + shadcn/ui

**Decision:** Next.js 16 with App Router, TanStack Query for server state, Zustand for client state, shadcn/ui for components.

**Alternatives considered:** Vite + React Router, Remix, plain Create React App.

**Why this choice:**
- App Router's server components handle data loading (study results, session lists) without client-side JavaScript, improving initial load performance for the results dashboard.
- TanStack Query manages all API state (caching, revalidation, optimistic updates) while Zustand handles pure client state (UI preferences, wizard progress). This separation prevents the common pitfall of mixing server cache with UI state.
- shadcn/ui provides accessible, unstyled component primitives that we own (copied into the codebase, not imported from node_modules). Full control over styling with Tailwind, no version lock-in.

**Tradeoff:** App Router's mental model (server vs. client components, when to use `"use client"`) has a learning curve. Some community libraries still do not fully support React Server Components.

---

## 12. Langfuse for LLM Observability

**Decision:** Langfuse for tracking LLM usage, cost, and performance across all pipeline stages.

**Alternatives considered:** Custom logging, LangSmith, Helicone.

**Why this choice:**
- A single study generates 200+ LLM API calls across 5 distinct stages (persona generation, navigation, screenshot analysis, synthesis, report). Without observability, debugging a bad study result means searching through hundreds of unstructured logs.
- Langfuse wraps the Anthropic client with zero code change — one decorator and it captures every prompt, response, token count, latency, and cost automatically.
- Cost-per-study tracking lets us validate our model routing strategy (decision #5) with real data. We can see exactly how much each pipeline stage costs and adjust routing accordingly.

**Tradeoff:** External SaaS dependency for observability. Self-hosted Langfuse is available as a fallback, but requires PostgreSQL + ClickHouse infrastructure.
