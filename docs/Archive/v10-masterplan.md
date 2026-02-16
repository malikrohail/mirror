# MIRROR v10 MASTERPLAN

## Vision: What Mirror Looks Like After 10 Iterations

Mirror v10 is the industry-standard AI usability testing platform. It's the tool every product team uses before shipping anything — the way linters catch code bugs, Mirror catches UX bugs. It runs in CI/CD pipelines, integrates with every design and project management tool, and generates insights that rival a senior UX researcher.

After 10 iterations, Mirror isn't just "AI personas clicking around your website." It's a full UX intelligence platform:

- **20+ persona archetypes** with proven behavioral fidelity calibrated against real user studies
- **Multi-device testing** (desktop, mobile, tablet) with geographic proxy support
- **CI/CD native** — runs on every PR, every deploy, blocks merges on UX regressions
- **Living UX scorecards** — track your UX score over time like you track test coverage
- **Competitive intelligence** — benchmark your flows against competitors automatically
- **Accessibility-first** — full WCAG 2.1 AA/AAA audit with screen reader simulation
- **Issue deduplication** — clusters findings across runs so you don't see the same issue 50 times
- **Impact prediction** — estimates conversion impact of each fix based on industry data
- **Integration everywhere** — Jira, Linear, Slack, Figma, GitHub, Notion, and 20+ more
- **Enterprise-ready** — SSO, RBAC, audit logs, data residency, SOC 2
- **API platform** — REST + GraphQL + Webhooks + SDKs for custom automation
- **Marketplace** — community persona templates, report templates, integration plugins

---

## Complete Feature Set (v10)

### 1. Study Engine

| Feature | Description |
|---------|------------|
| Multi-URL studies | Test multiple pages/flows in one study |
| Multi-task studies | Assign different tasks to different personas |
| Scheduled studies | Run studies on a cron (daily, weekly, on deploy) |
| Before/after comparison | Run same study before and after a change, show delta |
| Competitive benchmarking | Run same personas on your site AND competitor sites |
| A/B variant testing | Test two versions of the same page simultaneously |
| Authentication-aware | Inject auth cookies/tokens so personas can test logged-in flows |
| SPA navigation | Detect and handle React/Vue/Angular client-side routing |
| Dynamic content handling | Wait for lazy-loaded content, handle infinite scroll |
| Cookie consent handling | Auto-detect and handle cookie banners |
| CAPTCHA detection | Detect CAPTCHAs and report as blocked (not fail silently) |
| Geo-proxy support | Test from different geographic regions |
| Network throttling | Simulate slow connections (3G, slow WiFi) |
| Custom viewport sizes | Test at any resolution, not just standard breakpoints |
| Mobile device emulation | iPhone 15, Pixel 8, iPad, Galaxy S24 presets |
| Max step budget | Configurable per study (default 30, max 50) |
| Cost budget per study | Set a $ cap; Mirror optimizes model usage to stay under |

### 2. Persona Engine

| Feature | Description |
|---------|------------|
| 20+ pre-built templates | Covering age, tech literacy, accessibility, language, industry |
| Natural language builder | "A 55-year-old small business owner who..." → full persona |
| Fine-grained attributes | OCEAN personality, patience, reading speed, trust, device pref |
| Accessibility personas | Screen reader, low vision, color blind, motor impairment, cognitive |
| Industry-specific personas | E-commerce shopper, SaaS evaluator, healthcare patient, fintech user |
| Persona marketplace | Community-contributed and curated persona templates |
| Behavioral calibration | Feedback loop: "this finding was valid/invalid" tunes persona realism |
| Persona groups | Save sets of personas for reuse ("Our standard test group") |
| Custom frustration triggers | Define what specifically frustrates each persona |
| Language/locale support | Personas with different native languages, test i18n |

### 3. AI Analysis Pipeline

| Feature | Description |
|---------|------------|
| 5-stage pipeline | Generate → Navigate → Analyze → Synthesize → Report |
| Model routing | Opus for synthesis/reports, Sonnet for navigation/analysis (configurable) |
| Vision analysis | Screenshot-by-screenshot UX audit using multimodal AI |
| Heuristic evaluation | Auto-apply Nielsen's 10 heuristics to every page |
| WCAG assessment | Check contrast ratios, ARIA labels, keyboard nav, focus management |
| Emotional arc tracking | Track persona emotional state across session (curious → confused → frustrated) |
| Confidence scoring | Every issue has a confidence score + supporting evidence |
| Issue deduplication | Cluster duplicate/similar issues across runs and personas |
| Impact × effort matrix | Rank issues by estimated conversion impact and fix complexity |
| Trend analysis | Track UX score and issue counts over time across studies |
| Industry benchmarks | Compare your scores to industry averages (SaaS, e-commerce, etc.) |
| False positive reduction | Reviewer feedback loop to suppress recurring false positives |
| Severity calibration | Learn what severity levels your team actually cares about |
| PII redaction | Auto-detect and blur PII in screenshots (emails, phones, addresses) |

### 4. Results & Visualization

| Feature | Description |
|---------|------------|
| Executive summary | 3-5 sentence AI-generated overview of findings |
| UX score (0-100) | Aggregate score across personas, with breakdown by category |
| Struggle map | Flow visualization showing where personas bottleneck |
| Click heatmaps | Aggregate click density overlaid on page screenshots |
| Scroll depth maps | How far each persona scrolled on each page |
| Attention maps | AI-estimated attention areas based on viewport time |
| Session replay | Step-by-step screenshot viewer with think-aloud and annotations |
| Video replay | Stitch screenshots into video-like playback with timeline scrubber |
| Persona comparison table | Side-by-side: who completed, how many steps, top issues |
| Issue cards | Individual issue with severity, evidence screenshot, heuristic, fix |
| Funnel analysis | Multi-step task completion funnel showing drop-off points |
| Before/after diff | Visual comparison of study results before and after changes |

### 5. Reporting & Export

| Feature | Description |
|---------|------------|
| PDF report | Professional report with branding, screenshots, recommendations |
| Markdown report | For pasting into PRs, Notion, Confluence |
| HTML report | Shareable link with interactive elements |
| JSON export | Raw data for custom analysis |
| CSV export | Issue list as spreadsheet |
| Custom templates | Branded report templates with your logo and styling |
| White-label | Remove Mirror branding entirely (enterprise) |
| Scheduled reports | Auto-generate and email weekly UX reports |

### 6. Integrations

| Category | Integrations |
|----------|-------------|
| CI/CD | GitHub Actions, GitLab CI, Jenkins, CircleCI |
| Issue tracking | Jira, Linear, Asana, Shortcut, GitHub Issues |
| Communication | Slack, Discord, Microsoft Teams, email |
| Design | Figma (test prototypes), Storybook |
| Analytics | Google Analytics, Mixpanel, Amplitude, PostHog |
| Monitoring | Sentry, Datadog, PagerDuty (trigger study on incident) |
| Documentation | Notion, Confluence |
| API | REST API, GraphQL API, Webhooks |
| SDKs | Python SDK, Node.js SDK, CLI tool |
| Browser extension | Test current page with one click |
| VS Code extension | Run study from IDE |

### 7. Enterprise

| Feature | Description |
|---------|------------|
| SSO/SAML | Okta, Auth0, Azure AD, Google Workspace |
| SCIM provisioning | Auto-sync team members |
| RBAC | Owner, Admin, Editor, Viewer roles |
| Team workspaces | Isolated environments per team |
| Audit logs | Who did what, when |
| Data residency | US, EU, APAC storage options |
| Retention policies | Configurable auto-deletion (7/30/90/365 days) |
| SOC 2 Type II | Compliance certification |
| GDPR/CCPA | Full compliance with data subject rights |
| Private deployment | Self-hosted option for sensitive environments |
| SLA | 99.9% uptime guarantee |
| Priority support | Dedicated support engineer |

---

## v10 Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                    │
│                                                                         │
│  ┌──────────────┐  ┌────────────┐  ┌─────────┐  ┌──────────────────┐  │
│  │ Web App      │  │ CLI Tool   │  │ Browser │  │ CI/CD Actions    │  │
│  │ (Next.js)    │  │ (Python)   │  │ Ext.    │  │ (GitHub/GitLab)  │  │
│  └──────┬───────┘  └─────┬──────┘  └────┬────┘  └────────┬─────────┘  │
│         └─────────────────┴──────────────┴────────────────┘            │
│                                    │                                    │
└────────────────────────────────────┼────────────────────────────────────┘
                                     │ REST / GraphQL / WebSocket
┌────────────────────────────────────┼────────────────────────────────────┐
│                          API GATEWAY                                     │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ FastAPI                                                          │  │
│  │ • Auth middleware (Clerk JWT verification)                       │  │
│  │ • Rate limiting (Redis-backed)                                   │  │
│  │ • Request validation (Pydantic v2)                               │  │
│  │ • API versioning (/api/v1/, /api/v2/)                            │  │
│  │ • WebSocket hub (Redis PubSub fan-out)                           │  │
│  │ • Webhook dispatcher                                             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────┐
│                       SERVICE LAYER                                      │
│                                                                         │
│  ┌───────────────┐  ┌────────────────┐  ┌────────────────────────────┐ │
│  │ Study Service │  │ Persona Service│  │ Integration Service        │ │
│  │ • CRUD        │  │ • Templates    │  │ • Jira/Linear ticket       │ │
│  │ • Lifecycle   │  │ • Generation   │  │ • Slack notifications      │ │
│  │ • Scheduling  │  │ • Marketplace  │  │ • Webhook dispatch         │ │
│  └───────┬───────┘  └────────┬───────┘  └──────────────┬─────────────┘ │
│          │                   │                          │               │
│  ┌───────┴───────────────────┴──────────────────────────┴─────────────┐ │
│  │                    JOB ORCHESTRATOR                                 │ │
│  │  • Dispatches study runs to worker pool                            │ │
│  │  • Manages concurrency limits                                      │ │
│  │  • Handles retries, timeouts, cancellation                         │ │
│  │  • Publishes progress events to Redis                              │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ arq job queue (Redis)
┌────────────────────────────────────┼────────────────────────────────────┐
│                       WORKER LAYER                                       │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                NAVIGATION ENGINE (per persona)                    │  │
│  │                                                                   │  │
│  │  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │  │
│  │  │ PERCEIVE │───→│  THINK   │───→│   ACT    │───→│  RECORD  │  │  │
│  │  │ Screenshot│   │ Opus/    │    │ Playwright│    │ Save step│  │  │
│  │  │ + a11y   │   │ Sonnet   │    │ action    │    │ to DB +  │  │  │
│  │  │ tree     │   │ decision │    │           │    │ storage  │  │  │
│  │  └──────────┘   └──────────┘    └──────────┘    └────┬─────┘  │  │
│  │                                                       │        │  │
│  │                    ← loop until done/stuck/max_steps ─┘        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                ANALYSIS ENGINE (post-session)                     │  │
│  │  Screenshot Analyzer → Insight Synthesizer → Heatmap Gen →       │  │
│  │  Report Builder                                                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                PLAYWRIGHT BROWSER POOL                            │  │
│  │  • N headless Chromium instances (one per active persona)         │  │
│  │  • Lifecycle: launch → configure viewport → navigate → close      │  │
│  │  • Supports: desktop, mobile, tablet viewports                    │  │
│  │  • Handles: cookie consent, popups, auth injection                │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────┐
│                       DATA LAYER                                         │
│                                                                         │
│  ┌────────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ PostgreSQL     │  │ Redis    │  │ Object   │  │ Anthropic API    │ │
│  │ • Studies      │  │ • Cache  │  │ Storage  │  │ • Opus 4.6       │ │
│  │ • Sessions     │  │ • PubSub │  │ • Screen-│  │ • Sonnet 4.5     │ │
│  │ • Steps        │  │ • Queue  │  │   shots  │  │ • Vision         │ │
│  │ • Issues       │  │ • Rate   │  │ • Reports│  │ • Structured out │ │
│  │ • Insights     │  │   limits │  │ • Heatmaps│ │                  │ │
│  └────────────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3-Month Implementation Roadmap

### Month 1: Core Platform (Weeks 1-4)

**Goal:** End-to-end flow works — URL → personas navigate → results displayed

| Week | Milestone | Key Deliverables |
|------|-----------|-----------------|
| **Week 1** | **Dev Environment + Skeleton** | Docker Compose (Postgres + Redis), FastAPI scaffolding, Next.js scaffolding, database models + migrations, basic API endpoints (health, study CRUD), project structure established |
| **Week 2** | **Browser + AI Core** | Playwright browser pool, navigation agent loop (single persona), Opus 4.6 integration (persona gen + navigation decisions), screenshot capture, persona template system (8 templates) |
| **Week 3** | **Parallel Sessions + Results** | Study orchestrator (parallel personas via asyncio), WebSocket progress streaming, session data storage, basic results API, screenshot analyzer (post-session vision pass) |
| **Week 4** | **Frontend MVP** | Study setup wizard, live progress view (WebSocket), results dashboard (score, issues, persona comparison), session replay viewer (step-through), basic report export (Markdown) |

**Month 1 Deliverable:** Can enter URL + tasks, select personas, run 5 in parallel, watch live progress, see results dashboard with issues and session replay. Markdown report export.

### Month 2: Intelligence + Polish (Weeks 5-8)

**Goal:** Analysis is brilliant, UI is polished, edge cases handled

| Week | Milestone | Key Deliverables |
|------|-----------|-----------------|
| **Week 5** | **Deep Analysis** | Cross-persona insight synthesizer, struggle map generation, heatmap engine (click aggregation + Pillow rendering), issue severity ranking, impact × effort prioritization |
| **Week 6** | **Persona Depth** | Custom persona builder (NL → persona via Opus), 20+ persona templates, accessibility personas (screen reader, low vision), behavioral calibration (attribute → behavior mapping), persona profile cards |
| **Week 7** | **Edge Cases + Robustness** | SPA navigation handling, cookie consent auto-dismiss, auth wall detection, mobile viewport emulation, error recovery (retry logic, graceful failure), max step budget enforcement |
| **Week 8** | **UI Polish + UX** | Redesign pass on all pages, animations (Framer Motion), responsive layout, dark mode, loading/empty/error states, keyboard navigation, PDF report generation (WeasyPrint) |

**Month 2 Deliverable:** Production-quality analysis with cross-persona insights, heatmaps, custom personas, accessibility testing, mobile viewports. Polished UI. PDF reports.

### Month 3: Scale + Demo (Weeks 9-12)

**Goal:** Feature-complete, production-ready, demo is flawless

| Week | Milestone | Key Deliverables |
|------|-----------|-----------------|
| **Week 9** | **Integrations + CI/CD** | GitHub Action for automated UX testing, before/after comparison mode, Slack notifications, Linear/Jira issue creation from findings, webhook support |
| **Week 10** | **Advanced Features** | Competitive benchmarking (test your site vs competitors), scheduled/recurring studies, trend analysis (UX score over time), industry benchmarks, CLI tool (`mirror test <url>`) |
| **Week 11** | **Hardening + Testing** | Integration testing against 20+ diverse real websites, performance optimization (caching, batch API calls), security audit, rate limiting, PII redaction, Docker production config |
| **Week 12** | **Demo + Submission** | Build purposely-flawed demo website, record demo video (3 min), README + architecture docs, clean git history, deploy to cloud, submit |

**Month 3 Deliverable:** Full platform with CI/CD integration, competitive benchmarking, CLI, trend analysis. Tested against real websites. Polished demo. Submitted.

---

## The Three Agent Tasks

The implementation is split into 3 independent workstreams that can be developed in parallel by 3 Claude Code agents. Each agent has clear boundaries, shared interface contracts (API schemas, database models, WebSocket events), and independent test suites.

---

### AGENT 1: Backend Infrastructure & API

**Scope:** Everything from the API gateway down to the database, EXCEPT the AI/browser logic.

**What Agent 1 Builds:**

1. **Project Scaffolding**
   - `docker-compose.yml` with PostgreSQL 16, Redis 7
   - FastAPI application factory with lifespan management (startup/shutdown)
   - Pydantic Settings configuration (`app/config.py`)
   - `Makefile` with common commands

2. **Database Layer**
   - SQLAlchemy 2.0 async models for all entities (studies, tasks, personas, sessions, steps, issues, insights, persona_templates)
   - Alembic migrations
   - Async engine + session factory (`app/db/engine.py`)
   - Repository pattern for data access (`app/db/repositories/`)

3. **REST API**
   - All `/api/v1/` endpoints as defined in the API contract
   - Pydantic request/response schemas (`app/schemas/`)
   - FastAPI dependency injection for DB sessions, auth, etc.
   - Error handling middleware
   - CORS configuration
   - Health check endpoint (validates DB + Redis connectivity)

4. **WebSocket Server**
   - WebSocket endpoint at `/api/v1/ws`
   - Redis PubSub subscriber — listens for progress events published by workers
   - Fan-out to connected clients filtered by study_id
   - Connection lifecycle management (connect, subscribe, unsubscribe, disconnect)
   - Message schemas matching the WebSocket events contract

5. **Study Orchestrator**
   - `app/core/orchestrator.py` — manages study lifecycle
   - Dispatches study run to arq job queue
   - Manages status transitions: setup → running → analyzing → complete
   - Timeout handling (kills study after STUDY_TIMEOUT_SECONDS)
   - Progress tracking (aggregates per-session progress into study-level progress)

6. **Job Queue Infrastructure**
   - arq worker settings (`app/workers/settings.py`)
   - Task definitions (`app/workers/tasks.py`) — stubs that Agent 2 will fill with AI logic
   - Worker startup/shutdown hooks (initialize Playwright browser pool)

7. **Storage Service**
   - `app/storage/file_storage.py` — abstract interface for file storage
   - Local filesystem implementation (stores in `./data/studies/{id}/...`)
   - Methods: `save_screenshot(study_id, session_id, step_number, image_bytes)`, `get_screenshot_url(path)`, `save_report(study_id, format, content)`
   - Screenshot serving endpoint with signed URLs

8. **Persona Template Loader**
   - Load `persona_templates.json` into database on first run
   - Seed 20+ templates across categories

9. **Testing**
   - pytest fixtures for database (test DB, auto-rollback)
   - API endpoint tests (httpx async client)
   - WebSocket tests
   - Repository tests

**Interface Contract (What Agent 1 provides to Agent 2):**
- Database models and repositories for creating/updating studies, sessions, steps, issues, insights
- `StudyOrchestrator.run_study(study_id)` method that Agent 2 implements the core logic for
- arq task `run_study_task(ctx, study_id)` that Agent 2 fills in
- `FileStorage` service for saving screenshots and reports
- Redis publish helper for sending WebSocket events
- Pydantic schemas for all data structures

**Interface Contract (What Agent 1 provides to Agent 3):**
- All REST API endpoints with consistent response shapes
- WebSocket endpoint with documented event types
- Screenshot serving endpoint
- OpenAPI spec auto-generated by FastAPI

**Files Agent 1 Creates:**
```
docker-compose.yml
.env.example
Makefile
backend/pyproject.toml
backend/alembic.ini
backend/alembic/env.py
backend/alembic/versions/001_initial.py
backend/app/__init__.py
backend/app/main.py
backend/app/config.py
backend/app/dependencies.py
backend/app/api/__init__.py
backend/app/api/router.py
backend/app/api/v1/__init__.py
backend/app/api/v1/studies.py
backend/app/api/v1/sessions.py
backend/app/api/v1/personas.py
backend/app/api/v1/reports.py
backend/app/api/v1/screenshots.py
backend/app/api/v1/health.py
backend/app/api/ws/__init__.py
backend/app/api/ws/progress.py
backend/app/models/__init__.py
backend/app/models/base.py
backend/app/models/study.py
backend/app/models/task.py
backend/app/models/persona.py
backend/app/models/session.py
backend/app/models/step.py
backend/app/models/issue.py
backend/app/models/insight.py
backend/app/schemas/__init__.py
backend/app/schemas/study.py
backend/app/schemas/session.py
backend/app/schemas/persona.py
backend/app/schemas/report.py
backend/app/schemas/ws.py
backend/app/services/__init__.py
backend/app/services/study_service.py
backend/app/services/persona_service.py
backend/app/services/session_service.py
backend/app/services/report_service.py
backend/app/db/__init__.py
backend/app/db/engine.py
backend/app/db/repositories/__init__.py
backend/app/db/repositories/study_repo.py
backend/app/db/repositories/session_repo.py
backend/app/db/repositories/persona_repo.py
backend/app/storage/__init__.py
backend/app/storage/file_storage.py
backend/app/workers/__init__.py
backend/app/workers/settings.py
backend/app/workers/tasks.py
backend/app/data/persona_templates.json
backend/tests/conftest.py
backend/tests/test_api/test_studies.py
backend/tests/test_api/test_personas.py
backend/tests/test_api/test_health.py
```

**Definition of Done:**
- `docker compose up` starts PostgreSQL + Redis
- `uvicorn app.main:app` starts the API server
- All REST endpoints return correct responses (tested with httpx)
- WebSocket connects and receives test messages
- Database migrations run cleanly
- Persona templates loaded into DB
- Screenshots can be saved and served
- arq worker starts and can process a dummy task

---

### AGENT 2: AI Engine & Browser Automation

**Scope:** Everything that touches Playwright, Anthropic API, and the AI analysis pipeline.

**What Agent 2 Builds:**

1. **LLM Client**
   - `app/llm/client.py` — Anthropic API wrapper with:
     - Model routing (select Opus vs Sonnet per pipeline stage)
     - Retry logic with exponential backoff
     - Token usage tracking per study
     - Structured output parsing (JSON mode)
     - Vision API support (send screenshots as base64 images)
   - `app/llm/prompts.py` — All system prompts for 5 pipeline stages:
     - Stage 1: Persona Generation
     - Stage 2: Navigation Decision-Making (per step)
     - Stage 3: Screenshot UX Analysis (post-session)
     - Stage 4: Cross-Persona Insight Synthesis
     - Stage 5: Report Generation
   - `app/llm/schemas.py` — Pydantic response models:
     - `PersonaProfile` (full persona with all attributes)
     - `NavigationDecision` (think_aloud, action, ux_issues, confidence, emotional_state)
     - `ScreenshotAnalysis` (page_assessment, issues, strengths)
     - `StudySynthesis` (executive_summary, universal_issues, struggle_map, recommendations)
     - `ReportContent` (structured report sections)

2. **Persona Engine**
   - `app/core/persona_engine.py`:
     - `generate_persona(template_id)` — hydrate template into full PersonaProfile
     - `generate_custom_persona(description: str)` — NL description → PersonaProfile via Opus
     - `get_behavioral_modifiers(persona: PersonaProfile)` — translate attributes into behavior rules
     - Behavioral modifier mapping:
       - tech_literacy: low → reads every label, confused by icons; high → skips tutorials
       - patience_level: low → gives up after 3 failures; high → perseveres
       - reading_speed: skims → misses body text; thorough → reads everything
       - trust_level: skeptical → hesitates at forms; trusting → fills everything

3. **Playwright Browser Pool**
   - `app/browser/pool.py`:
     - `BrowserPool` class — manages N headless Chromium instances
     - `acquire()` — get a browser context (with viewport config)
     - `release()` — return browser context to pool
     - Lifecycle hooks: initialize on worker startup, cleanup on shutdown
     - Viewport presets: desktop (1920x1080), laptop (1366x768), mobile (390x844), tablet (768x1024)
   - `app/browser/actions.py`:
     - `click(page, selector)` — click with wait-for-navigation
     - `type_text(page, selector, value)` — type with realistic delays
     - `scroll(page, direction, amount)` — scroll up/down/to element
     - `navigate(page, url)` — goto with wait-for-load
     - `wait(page, ms)` — explicit wait
     - Action retry logic (element not found → wait and retry once)
   - `app/browser/screenshots.py`:
     - `capture_screenshot(page)` → bytes (PNG, full viewport)
     - `capture_with_highlight(page, selector)` → screenshot with element highlighted
     - `get_accessibility_tree(page)` → text representation of page a11y tree
     - `get_page_metadata(page)` → {url, title, viewport_width, viewport_height}

4. **Navigation Agent Loop**
   - `app/core/navigator.py` — THE core loop, one per persona per task:
     ```
     async def navigate_session(session_id, persona, task, browser_context):
         page = await browser_context.new_page()
         await page.goto(study.url + study.starting_path)

         for step_number in range(1, MAX_STEPS + 1):
             # 1. PERCEIVE
             screenshot = await capture_screenshot(page)
             a11y_tree = await get_accessibility_tree(page)
             page_meta = await get_page_metadata(page)

             # 2. THINK (LLM call)
             decision = await llm_client.navigate_step(
                 persona=persona,
                 task=task,
                 screenshot=screenshot,
                 a11y_tree=a11y_tree,
                 page_meta=page_meta,
                 history=step_history
             )

             # 3. ACT
             await execute_action(page, decision.action)

             # 4. RECORD
             await save_step(session_id, step_number, screenshot, decision, page_meta)
             await publish_step_event(session_id, step_number, decision)

             # Check termination
             if decision.action.type in ('done', 'give_up') or decision.task_progress >= 95:
                 break

         # 5. POST-SESSION
         summary = await llm_client.generate_session_summary(session_id)
         await save_session_summary(session_id, summary)
     ```
   - Stuck detection: if same page_url for 3+ consecutive steps with no progress, suggest "give_up"
   - Error recovery: if Playwright action fails, retry once, then skip and log

5. **Study Orchestrator Integration**
   - `run_study_task(ctx, study_id)` — the arq task implementation:
     1. Load study with tasks and personas from DB
     2. Generate full PersonaProfiles for each persona
     3. Launch N parallel `navigate_session()` coroutines via `asyncio.gather()`
     4. Wait for all sessions to complete
     5. Run post-session analysis pipeline:
        a. Screenshot analysis (Opus vision pass on each session's screenshots)
        b. Cross-persona synthesis (comparative analysis)
        c. Heatmap generation
        d. Report generation
     6. Update study status to `complete`
     7. Publish `study:complete` event

6. **Screenshot Analyzer**
   - `app/core/analyzer.py`:
     - Per-step analysis: send screenshot to Opus vision, get detailed UX audit
     - Batch analysis: analyze all screenshots in a session
     - Output: page_assessment scores, issues with severity/heuristic/WCAG, strengths
     - Deduplication: cluster similar issues across steps

7. **Cross-Persona Synthesizer**
   - `app/core/synthesizer.py`:
     - Input: all session data from all personas
     - Output: executive_summary, universal_issues, persona_specific_issues, struggle_map, prioritized_recommendations, overall_ux_score
     - Identifies: where ALL personas struggled (universal) vs persona-specific issues
     - Generates: impact × effort ranking for recommendations

8. **Heatmap Generator**
   - `app/core/heatmap.py`:
     - Aggregate click_x/click_y from all steps on the same page_url
     - Normalize coordinates to standard viewport
     - Generate heatmap overlay PNG using Pillow (gaussian blur)
     - Return as base64 or save to storage

9. **Report Builder**
   - `app/core/report_builder.py`:
     - Generate structured Markdown report (executive summary, methodology, findings, recommendations)
     - Convert Markdown → PDF via WeasyPrint with custom CSS
     - Include annotated screenshots in report
     - Include persona comparison table, issue list, recommendation ranking

10. **Testing**
    - Unit tests for LLM client (mock API responses)
    - Integration tests for navigation loop (mock Playwright + mock LLM)
    - Persona engine tests (template hydration, custom generation)
    - Analyzer/synthesizer tests (mock data → expected output structure)

**Interface Contract (What Agent 2 depends on from Agent 1):**
- Database models and repositories (to save sessions, steps, issues, insights)
- `FileStorage` service (to save screenshots, heatmaps, reports)
- Redis publish helper (to send WebSocket events)
- arq task infrastructure (Agent 2 implements the task function body)

**Files Agent 2 Creates:**
```
backend/app/llm/__init__.py
backend/app/llm/client.py
backend/app/llm/prompts.py
backend/app/llm/schemas.py
backend/app/core/__init__.py
backend/app/core/orchestrator.py       (implements the study run logic)
backend/app/core/navigator.py
backend/app/core/analyzer.py
backend/app/core/synthesizer.py
backend/app/core/persona_engine.py
backend/app/core/heatmap.py
backend/app/core/report_builder.py
backend/app/browser/__init__.py
backend/app/browser/pool.py
backend/app/browser/actions.py
backend/app/browser/screenshots.py
backend/tests/test_core/test_navigator.py
backend/tests/test_core/test_analyzer.py
backend/tests/test_core/test_persona_engine.py
backend/tests/test_core/test_synthesizer.py
backend/tests/test_browser/test_pool.py
backend/tests/test_browser/test_actions.py
```

**Definition of Done:**
- Single persona can navigate a test website end-to-end (e.g., httpbin.org or a local test page)
- Screenshots captured at every step and saved to storage
- Think-aloud narration generated for each step
- UX issues detected and saved to database
- 5 personas run in parallel without browser crashes
- Cross-persona synthesis produces meaningful comparative insights
- Heatmap PNG generated from aggregated click data
- PDF report generated with screenshots and recommendations
- All 5 pipeline stages produce valid, parseable output

---

### AGENT 3: Frontend Application

**Scope:** The complete Next.js web application — all pages, components, hooks, state management, and real-time features.

**What Agent 3 Builds:**

1. **Project Setup**
   - Next.js 15 with App Router, TypeScript strict mode
   - Tailwind CSS + shadcn/ui initialization
   - TanStack Query provider + Zustand stores
   - API client (`lib/api-client.ts`) — typed fetch wrapper matching backend API contract
   - WebSocket client (`lib/ws-client.ts`) — connect, subscribe, handle events
   - TypeScript types (`types/index.ts`) — matching backend Pydantic schemas

2. **Layout & Navigation**
   - Root layout with header (logo, nav, user menu)
   - Sidebar navigation (Dashboard, New Study, Personas, Settings)
   - Responsive design (mobile sidebar → hamburger menu)
   - Dark mode support (system preference + toggle)
   - Loading skeletons for all pages

3. **Dashboard Page (`/`)**
   - Hero section with URL input (paste URL → quick start)
   - Recent studies grid (cards with: URL, persona count, UX score, issue count, time ago)
   - Empty state for first-time users
   - Quick stats (total studies, avg score, common issues)

4. **Study Setup Wizard (`/study/new`)**
   - 3-step wizard with progress indicator:
     - Step 1: Target Website (URL input, starting path, validation with URL preview)
     - Step 2: Tasks (task description textarea, add/remove tasks, 1-3 tasks)
     - Step 3: Personas (template selector grid with checkboxes, custom persona link, selected count)
   - Review summary before "Run Study"
   - Animated transitions between steps

5. **Live Progress View (`/study/[id]/running`)**
   - WebSocket connection to receive real-time updates
   - Overall study progress bar with percentage
   - Per-persona progress cards:
     - Persona avatar + name
     - Step progress bar (e.g., "Step 8/25")
     - Latest think-aloud quote
     - Emotional state indicator (emoji)
     - Status badge (running, complete, failed, gave up)
   - Live screenshot preview (most recent screenshot from selected persona)
   - Auto-redirect to results when study completes

6. **Results Dashboard (`/study/[id]`)**
   - Top-level score cards: UX Score (0-100), Issues Found (by severity), Task Completion (X/N)
   - Tab navigation: Overview | Session Replay | Heatmap | Issues | Report
   - **Overview tab:**
     - Executive summary (AI-generated text)
     - Struggle map (flow visualization showing bottlenecks)
     - Persona comparison table (persona, steps, completed?, top issue)
     - Top 3 recommendations (rank, description, impact, effort, personas helped)
   - **Issues tab:**
     - Filterable issue list (by severity, persona, page URL)
     - Issue cards (element, description, severity badge, heuristic, screenshot thumbnail, recommendation)
     - Sort by severity or persona count

7. **Session Replay (`/study/[id]/session/[sessionId]`)**
   - Screenshot viewer (large, centered)
   - Step navigation: prev/next buttons + timeline scrubber + keyboard arrows
   - Think-aloud bubble below screenshot
   - Issue annotations overlaid on screenshot (optional toggle)
   - Step metadata: action taken, confidence, emotional state, task progress
   - Persona info sidebar
   - Auto-play mode (step through at 2-second intervals)

8. **Heatmap View (`/study/[id]/heatmap`)**
   - Page selector dropdown (list all unique page URLs from study)
   - Screenshot of selected page with heatmap overlay (canvas or <img>)
   - Click summary list (element, click count, persona breakdown)
   - Heatmap opacity slider
   - Legend (color scale)

9. **Report View (`/study/[id]/report`)**
   - Report preview (rendered Markdown)
   - Export buttons: Download PDF, Download Markdown, Copy to Clipboard
   - Print-friendly styles

10. **Persona Library (`/personas`)**
    - Grid of pre-built persona template cards
    - Each card: emoji, name, age, tech literacy, key trait, select button
    - Category filters (General, Accessibility, Industry-specific)
    - Link to custom builder

11. **Custom Persona Builder (`/personas/builder`)**
    - Natural language textarea ("Describe your persona...")
    - "Generate" button → loading → persona preview card
    - Manual fine-tuning form (name, age, tech literacy sliders, accessibility checkboxes, frustration triggers)
    - Save persona button
    - Live preview card that updates as you type/adjust

12. **Shared Components**
    - `PersonaCard` — reusable persona display card with avatar, name, attributes
    - `ScoreCard` — metric card (value, label, trend indicator)
    - `ProgressBar` — animated progress bar with percentage
    - `ExportButton` — download button with format selector
    - `EmptyState` — illustrated empty state with CTA
    - `ThinkAloudBubble` — speech bubble with persona avatar
    - `SeverityBadge` — colored badge (critical=red, major=orange, minor=yellow, enhancement=blue)
    - `StepTimeline` — horizontal timeline with step markers

13. **Hooks**
    - `use-study.ts` — TanStack Query hooks for all study API operations
    - `use-websocket.ts` — WebSocket connection management + event handlers
    - `use-session-replay.ts` — step navigation state (current step, next, prev, auto-play)
    - `use-personas.ts` — TanStack Query hooks for persona templates + custom generation

14. **State Management**
    - `study-store.ts` (Zustand):
      - Active study state (for running study page)
      - Per-persona progress (updated via WebSocket)
      - Selected persona for live preview
    - `ui-store.ts` (Zustand):
      - Sidebar collapsed/expanded
      - Dark mode
      - Selected tab on results page

15. **Testing**
    - Component tests with Vitest + React Testing Library
    - Hook tests
    - API client tests (MSW mock server)

**Interface Contract (What Agent 3 depends on from Agent 1):**
- REST API endpoints (documented in API contract section of CLAUDE.md)
- WebSocket events (documented in WebSocket events contract)
- Screenshot URLs (served by `/api/v1/screenshots/`)
- Response shapes matching the Pydantic schemas

**Files Agent 3 Creates:**
```
frontend/package.json
frontend/next.config.ts
frontend/tailwind.config.ts
frontend/tsconfig.json
frontend/components.json
frontend/src/app/layout.tsx
frontend/src/app/page.tsx
frontend/src/app/study/new/page.tsx
frontend/src/app/study/[id]/page.tsx
frontend/src/app/study/[id]/running/page.tsx
frontend/src/app/study/[id]/session/[sessionId]/page.tsx
frontend/src/app/study/[id]/heatmap/page.tsx
frontend/src/app/study/[id]/report/page.tsx
frontend/src/app/personas/page.tsx
frontend/src/app/personas/builder/page.tsx
frontend/src/components/ui/*                    (shadcn primitives)
frontend/src/components/layout/Header.tsx
frontend/src/components/layout/Sidebar.tsx
frontend/src/components/study/StudyCard.tsx
frontend/src/components/study/StudySetupWizard.tsx
frontend/src/components/study/TaskInput.tsx
frontend/src/components/study/StudyProgress.tsx
frontend/src/components/persona/PersonaCard.tsx
frontend/src/components/persona/PersonaSelector.tsx
frontend/src/components/persona/PersonaBuilder.tsx
frontend/src/components/results/ScoreCard.tsx
frontend/src/components/results/StruggleMap.tsx
frontend/src/components/results/IssueList.tsx
frontend/src/components/results/PersonaComparison.tsx
frontend/src/components/results/RecommendationList.tsx
frontend/src/components/session/SessionReplay.tsx
frontend/src/components/session/ScreenshotViewer.tsx
frontend/src/components/session/ThinkAloudBubble.tsx
frontend/src/components/session/StepTimeline.tsx
frontend/src/components/heatmap/ClickHeatmap.tsx
frontend/src/components/heatmap/HeatmapOverlay.tsx
frontend/src/components/common/ProgressBar.tsx
frontend/src/components/common/ExportButton.tsx
frontend/src/components/common/EmptyState.tsx
frontend/src/hooks/use-study.ts
frontend/src/hooks/use-websocket.ts
frontend/src/hooks/use-session-replay.ts
frontend/src/hooks/use-personas.ts
frontend/src/lib/api-client.ts
frontend/src/lib/ws-client.ts
frontend/src/lib/utils.ts
frontend/src/lib/constants.ts
frontend/src/stores/study-store.ts
frontend/src/stores/ui-store.ts
frontend/src/types/index.ts
frontend/public/mirror-logo.svg
```

**Definition of Done:**
- All pages render with proper layout and navigation
- Study setup wizard creates a study via API (or mock)
- Live progress page connects to WebSocket and shows real-time updates
- Results dashboard displays all study data with tabs
- Session replay allows stepping through screenshots with think-aloud
- Heatmap renders click density overlay on screenshots
- Report page shows preview and allows PDF/Markdown download
- Persona library displays all templates with selection
- Custom persona builder generates and previews personas
- Responsive design works on desktop and mobile
- Dark mode toggles correctly
- All loading, empty, and error states handled

---

## Coordination Between Agents

### Shared Contracts (Must Be Agreed Before Parallel Work)

1. **Database Schema** — Agent 1 defines the models. Agent 2 uses them. Agent 3 consumes them via API.
2. **API Response Shapes** — Agent 1 defines Pydantic schemas. Agent 3 mirrors them in TypeScript types.
3. **WebSocket Event Format** — Agent 1 defines the event schemas. Agent 2 publishes them. Agent 3 subscribes.
4. **File Storage Paths** — Agent 1 defines the storage interface. Agent 2 saves files through it. Agent 3 reads via screenshot API.

### Integration Order

1. **Week 1**: All 3 agents work independently on scaffolding
2. **Week 2**: Agent 1 has API endpoints ready (can return mock data). Agent 3 starts integrating against API.
3. **Week 3**: Agent 2 has navigation working. Agent 1 connects orchestrator to Agent 2's run logic. Real data starts flowing.
4. **Week 4**: All 3 integrate end-to-end. First full study run through the UI.
5. **Weeks 5-12**: Iterative improvement, feature additions, polish.

### Dependency Graph

```
Agent 1 (Infra)  ──provides DB/API──→  Agent 2 (AI Engine) uses DB + storage
                  ──provides API──→    Agent 3 (Frontend) calls API + WebSocket
Agent 2 (AI)     ──provides events──→  Agent 1 (Infra) forwards via WebSocket
                                       Agent 3 (Frontend) displays real-time
```

No circular dependencies. Agent 1 is the foundation. Agents 2 and 3 can work in parallel against Agent 1's interfaces.

---

## Demo Strategy (Hackathon Submission)

### The Demo Website

Build a **purposely flawed demo website** (simple SaaS landing page) with planted UX issues:

1. "Workspace" instead of "Team Name" in signup form
2. Social login buttons below the fold (not visible without scrolling)
3. 7-step onboarding flow (too many steps)
4. Low-contrast text on pricing page
5. No confirmation feedback after email verification
6. Hamburger menu icon with no label on desktop
7. Jargon-heavy copy ("Supercharge your content pipeline")
8. Required phone number field in signup

This ensures the demo always produces compelling, reproducible results.

### 3-Minute Demo Script

```
[0:00-0:15] HOOK
"How many of you have shipped something and immediately gotten complaints
about usability? What if you could run a usability study in 5 minutes?"

[0:15-0:40] SETUP
Show Mirror dashboard → Enter URL → Define task → Select 5 diverse personas
→ Click "Run Study"

[0:40-1:30] THE MAGIC
Live progress screen: 5 personas navigating simultaneously
- Live screenshot updates
- Think-aloud bubbles appearing in real-time
- One persona getting confused, emotional state changing
- One persona giving up
- "This is 5 AI personas actually using the real website right now"

[1:30-2:20] RESULTS
Dashboard: UX Score 72/100, 14 issues, 3/5 completed
- Struggle map: bottlenecks highlighted
- Persona comparison: "College student = 12 steps, Retiree = 22 steps"
- Click into session replay: retiree confused by "workspace"
- Heatmap: "0% found social login — it's below the fold"

[2:20-2:50] IMPACT
Top 3 recommendations with impact/effort
"Replace 'workspace' with 'team name' — High impact, Low effort, 15 min fix"
Export PDF report
"This took 4 minutes. Same study with real users: $12,000, 6 weeks."

[2:50-3:00] CLOSE
"Mirror uses Opus 4.6 to create AI personas that don't just analyze
your UI — they experience it. Open source."
```

---

## Scoring Optimization

| Criterion | Weight | Our Approach |
|-----------|--------|-------------|
| **Demo** | 30% | The live persona navigation is inherently compelling. Before/after transformation. Money shot: persona giving up in frustration. |
| **Opus 4.6 Usage** | 25% | 5 distinct pipeline stages. Multimodal vision. Deep persona reasoning. Multi-agent parallel sessions. Structured output. Cross-persona synthesis. |
| **Impact** | 25% | $12K → $15 (800x cheaper). 6 weeks → 5 minutes (8,640x faster). Democratizes UX testing for every developer. |
| **Depth & Execution** | 20% | Full pipeline (not one API call). Real browser automation. Polished UI. Edge case handling. Open source. |

---

## Post-Hackathon (Months 4-12 Vision)

After the hackathon, Mirror evolves into a full SaaS:

| Phase | Timeline | Key Additions |
|-------|----------|--------------|
| Design Partner Beta | Month 4-5 | 10 design partners, weekly studies, feedback loop to tune precision |
| Paid Launch | Month 6-7 | Self-serve billing (Stripe), CI/CD regression workflow, Jira/Linear/Slack integrations |
| Enterprise Readiness | Month 8-10 | SSO, audit logs, governance, data residency, SOC 2 roadmap |
| Platform | Month 10-12 | API platform, CLI, SDKs, browser extension, marketplace, white-label |

### Pricing

| Tier | Price | Includes |
|------|-------|---------|
| Free | $0 | 5 studies/month, 3 personas, watermark reports |
| Pro | $79/mo | 60 studies/month, CI/CD, integrations, no watermark |
| Team | $299/mo | 300 studies/month, shared workspace, prioritization, 5 seats |
| Enterprise | Custom | SSO, governance, SLA, unlimited, dedicated support |

### Core Metrics

1. **Activation**: First study completed within 15 minutes of signup
2. **Value moment**: At least 1 accepted issue in first 24 hours
3. **Retention**: Weekly study rerun rate
4. **Quality**: Accepted-finding rate (track false positives)
5. **Revenue**: Expansion via seats + volume
