# AGENT 3 — Backend & ML Battleplan

## Mission: Make Mirror Unbeatable

**Context**: Agent 1 (infra) and Agent 2 (AI engine) are done. Frontend is handled by a partner. This plan covers 1-2 weeks of intensive backend/ML work to take Mirror from "working prototype" to "hackathon winner."

**Current State**: The pipeline works end-to-end BUT step data, screenshots, and issues **never persist to the database**. The frontend has nothing to display. Fix this first, then layer on the features that make judges say "holy shit."

---

## PRIORITY 0 — THE SHOWSTOPPER FIX (Day 1, ~4 hours)

### 0.1 Implement StepRecorder — Wire Navigation to Database

**Why**: Without this, the entire product is a black box. Studies "complete" but produce zero visible results. This is the #1 blocker.

**What to build**: A concrete `StepRecorder` class in `app/core/step_recorder.py` that implements the `StepRecorder` protocol from `navigator.py`:

```
class DatabaseStepRecorder(StepRecorder):
    async def save_step(session_id, step_number, screenshot, decision, ...):
        1. Save screenshot bytes → FileStorage.save_screenshot()
        2. Create Step row in DB (page_url, think_aloud, action_type,
           selector, confidence, emotional_state, task_progress,
           click_x, click_y, screenshot_path)
        3. For each issue in decision.ux_issues:
           → Create Issue row in DB (element, description, severity,
             heuristic, wcag_criterion, recommendation, page_url)
        4. Commit transaction

    async def publish_step_event(session_id, persona_name, step_number, decision, screenshot_url):
        1. Publish to Redis channel f"study:{study_id}"
        2. Event shape: {type: "session:step", session_id, persona_name,
           step_number, think_aloud, screenshot_url, emotional_state,
           action, task_progress}
```

**Then**: Update `orchestrator.py` to inject the recorder into `Navigator.navigate_session()`.

**Files**:
- CREATE `backend/app/core/step_recorder.py`
- MODIFY `backend/app/core/orchestrator.py` (pass recorder to navigator)

**Definition of Done**: After a study runs, `GET /api/v1/sessions/{id}/steps` returns real step data with screenshot URLs, think-aloud text, and emotional states.

---

### 0.2 Wire Custom Persona Generation Endpoint

**Why**: The LLM logic exists but the API endpoint returns a stub. 5-minute fix.

**What to do**: In `app/api/v1/personas.py`, replace the stub `POST /generate` with:
```python
profile = await llm_client.generate_persona_from_description(data.description)
# Save to DB as custom persona
return profile.model_dump()
```

**Files**: MODIFY `backend/app/api/v1/personas.py`

---

### 0.3 Wire Insights to Database After Synthesis

**Why**: The synthesizer produces insights and recommendations but they're not saved to the `insights` table.

**What to do**: After `synthesizer.synthesize()` returns `StudySynthesis`, iterate through `universal_issues`, `persona_specific_issues`, `comparative_insights`, and `recommendations` — create `Insight` rows in DB.

**Files**: MODIFY `backend/app/core/orchestrator.py`

---

## PRIORITY 1 — DEMO-WINNING FEATURES (Days 2-4)

These are the features that make the 3-minute demo jaw-dropping.

### 1.1 Build the Intentionally-Flawed Demo Website

**Why**: The hackathon demo needs a site with PLANTED UX issues that Mirror reliably finds. This makes the demo reproducible and impressive.

**What to build**: A simple static SaaS landing page (Flask or plain HTML served by the backend) with these planted issues:

| # | Planted Issue | What Personas Find |
|---|--------------|-------------------|
| 1 | "Workspace" instead of "Team Name" in signup | Non-tech personas confused |
| 2 | Social login buttons below the fold | Nobody finds them |
| 3 | 7-step onboarding wizard | Low-patience personas give up |
| 4 | Low-contrast text (#999 on #fff) on pricing | Low-vision personas can't read |
| 5 | No confirmation after email verification | All personas confused |
| 6 | Hamburger menu icon with no label on desktop | Elderly personas lost |
| 7 | Jargon: "Supercharge your content pipeline" | Non-tech personas confused |
| 8 | Required phone number in signup | Skeptical personas hesitate |
| 9 | Tiny close button (12px) on modal | Motor impairment persona stuck |
| 10 | Form resets on validation error | ALL personas frustrated |

**Files**:
- CREATE `backend/demo_site/` directory
- CREATE `backend/demo_site/app.py` (Flask app or static file server)
- CREATE `backend/demo_site/templates/` (landing, signup, onboarding, pricing pages)
- CREATE `backend/demo_site/static/` (CSS with intentional issues)

**Definition of Done**: `python demo_site/app.py` serves a website at localhost:5001 that Mirror can test against and reliably find 8+ issues.

---

### 1.2 Firecrawl Integration — Site Pre-Crawling

**Why**: Before personas navigate, crawl the target site to discover pages and extract content. This gives the navigation engine a "map" — making personas smarter and reducing wasted steps. Also a scoring differentiator (shows technical depth).

**What to build**: `app/core/firecrawl_client.py`

```
class FirecrawlClient:
    async def crawl_site(url: str) -> SiteMap:
        """Pre-crawl a site to discover pages, links, and content."""
        # Uses Firecrawl API to:
        # 1. Discover all pages (max 50)
        # 2. Extract page titles, headings, links
        # 3. Build a sitemap graph
        # 4. Identify key pages (signup, login, pricing, etc.)

    async def get_page_content(url: str) -> PageContent:
        """Extract clean text content from a single page."""
```

**Integration points**:
- Orchestrator Phase 1.5: After persona generation, before navigation, run Firecrawl
- Pass sitemap context to the navigation prompt so personas know what pages exist
- Update `prompts.py` navigation prompt to include: "SITE MAP: These pages exist: ..."

**Files**:
- CREATE `backend/app/core/firecrawl_client.py`
- CREATE `backend/app/llm/schemas.py` → add `SiteMap`, `PageContent` models
- MODIFY `backend/app/core/orchestrator.py` (add crawl phase)
- MODIFY `backend/app/llm/prompts.py` (add sitemap to navigation prompt)

---

### 1.3 Langfuse Integration — LLM Observability

**Why**: With 200+ API calls per study across 5 pipeline stages, you need visibility into token usage, costs, latency, and failures. Judges love dashboards. Also critical for debugging.

**What to build**: Wrap the Anthropic client with Langfuse tracing.

```python
# In app/llm/client.py
from langfuse import Langfuse

class LLMClient:
    def __init__(self):
        self._langfuse = Langfuse()  # Auto-reads env vars

    async def _call(self, stage, system, messages, ...):
        trace = self._langfuse.trace(name=f"mirror-{stage}")
        generation = trace.generation(
            name=stage,
            model=self._get_model(stage),
            input=messages,
        )
        response = await self._client.messages.create(...)
        generation.end(output=response.content, usage={...})
        return response
```

**What you get**:
- Per-study cost tracking (show in dashboard: "This study cost $0.47")
- Per-stage latency (navigation avg 2.1s, synthesis 8.3s)
- Token usage breakdown
- Error tracking and retry visibility
- A beautiful Langfuse dashboard to show in the demo

**Files**:
- MODIFY `backend/app/llm/client.py` (add Langfuse wrapping)
- MODIFY `backend/pyproject.toml` (add `langfuse` dependency)

---

### 1.4 Real-Time Think-Aloud Streaming

**Why**: The live progress page is Mirror's "holy shit" moment. Right now it publishes step events, but the think-aloud text and emotional state updates need to stream smoothly.

**What to build**: Enhance the step event publisher to send richer events:

```json
{
  "type": "session:step",
  "session_id": "...",
  "persona_name": "Maria Garcia",
  "persona_emoji": "👵",
  "step_number": 8,
  "think_aloud": "I can't find where to sign up... this is frustrating",
  "emotional_state": "frustrated",
  "action": {"type": "scroll", "description": "Scrolling down to find signup"},
  "task_progress": 25,
  "screenshot_url": "/api/v1/screenshots/...",
  "confidence": 0.4,
  "ux_issues_found": 1,
  "page_url": "https://example.com/signup"
}
```

**Also add**: A `session:emotional_shift` event when emotional state changes dramatically (e.g., curious → frustrated), so the frontend can animate it.

**Files**:
- MODIFY `backend/app/core/step_recorder.py` (enrich events)
- MODIFY `backend/app/schemas/ws.py` (update event schemas)

---

## PRIORITY 2 — INTELLIGENCE DEPTH (Days 5-8)

These features make Mirror's analysis genuinely useful, not just a toy demo.

### 2.1 Issue Deduplication Across Studies

**Why**: If you run the same study twice, you get duplicate issues. Smart dedup shows engineering depth.

**What to build**: `app/core/deduplicator.py`

- After synthesis, compare new issues against existing issues for the same URL
- Use embedding similarity (or simple string matching) to cluster duplicates
- Mark issues as `first_seen`, `times_seen`, `last_seen`
- Add `is_regression` flag: issue that was fixed but came back

**Files**:
- CREATE `backend/app/core/deduplicator.py`
- MODIFY `backend/app/models/issue.py` (add `first_seen_study_id`, `times_seen`, `is_regression`)
- CREATE `backend/alembic/versions/002_issue_tracking.py`

---

### 2.2 Severity Calibration — Smarter Issue Ranking

**Why**: Not all "critical" issues are equally critical. Rank by: (1) how many personas hit it, (2) did it cause give-up, (3) is it on a high-traffic page.

**What to build**: Post-synthesis scoring pass:

```python
class IssuePrioritizer:
    def prioritize(issues, sessions, synthesis):
        for issue in issues:
            score = 0
            score += personas_affected_count * 20   # Universal = high priority
            score += caused_give_up * 50             # Blocked completion = critical
            score += on_landing_page * 15            # High-traffic page = higher impact
            score += severity_base_score             # critical=40, major=25, minor=10
            issue.priority_score = score
        return sorted(issues, key=lambda i: i.priority_score, reverse=True)
```

**Files**:
- CREATE `backend/app/core/prioritizer.py`
- MODIFY `backend/app/models/issue.py` (add `priority_score`)
- MODIFY `backend/app/core/orchestrator.py` (add prioritization phase)

---

### 2.3 Emotional Journey Visualization Data

**Why**: Showing the emotional arc (curious → confused → frustrated → gave_up) is incredibly compelling in demos. The data exists but isn't well-structured for the frontend.

**What to build**: An API endpoint that returns the emotional journey for each persona:

```
GET /api/v1/studies/{id}/emotional-journeys
→ {
    "personas": [
      {
        "name": "Maria Garcia",
        "emoji": "👵",
        "journey": [
          {"step": 1, "emotion": "curious", "page": "/", "think_aloud": "..."},
          {"step": 5, "emotion": "confused", "page": "/signup", "think_aloud": "..."},
          {"step": 12, "emotion": "frustrated", "page": "/onboarding", "think_aloud": "..."},
        ],
        "outcome": "gave_up",
        "peak_frustration_step": 12,
        "peak_frustration_page": "/onboarding"
      }
    ]
  }
```

**Files**:
- CREATE `backend/app/api/v1/journeys.py`
- MODIFY `backend/app/api/router.py` (mount new endpoint)

---

### 2.4 Scroll Depth Tracking

**Why**: Click heatmaps exist but scroll depth is equally important. "0% of personas scrolled below the fold" is a killer insight.

**What to build**: In the navigation loop, after each scroll action, record:
- `scroll_y`: Current scroll position
- `max_scroll_y`: Maximum scroll depth reached
- `viewport_height`: To calculate % of page seen

Add to step recording. Then add an aggregation endpoint:

```
GET /api/v1/studies/{id}/scroll-depth?page_url=...
→ { "page_url": "...", "page_height": 3200, "personas": [
    {"name": "Maria", "max_depth_px": 800, "max_depth_pct": 25},
    {"name": "Alex", "max_depth_px": 3200, "max_depth_pct": 100}
  ]}
```

**Files**:
- MODIFY `backend/app/browser/screenshots.py` (add `get_scroll_position()`)
- MODIFY `backend/app/core/navigator.py` (record scroll depth at each step)
- MODIFY `backend/app/models/step.py` (add `scroll_y`, `max_scroll_y`)
- CREATE `backend/alembic/versions/003_scroll_depth.py`
- CREATE `backend/app/api/v1/scroll_depth.py`

---

### 2.5 Page Load Performance Tracking

**Why**: "Your pricing page takes 4.2 seconds to load — Maria gave up waiting" is a powerful finding.

**What to build**: Measure and record page load metrics at each navigation step:

```python
# In navigator, after page.goto():
perf = await page.evaluate("""
    () => ({
        dom_content_loaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        load_complete: performance.timing.loadEventEnd - performance.timing.navigationStart,
        first_paint: performance.getEntriesByType('paint')[0]?.startTime || null,
    })
""")
```

Store in step data. Surface slow pages in the synthesis as "performance issues."

**Files**:
- MODIFY `backend/app/browser/screenshots.py` (add `get_performance_metrics()`)
- MODIFY `backend/app/core/navigator.py` (record perf at each step)
- MODIFY `backend/app/models/step.py` (add `load_time_ms`, `first_paint_ms`)
- MODIFY `backend/app/llm/prompts.py` (tell synthesis about slow pages)

---

## PRIORITY 3 — COMPETITIVE EDGE (Days 9-11)

### 3.1 Before/After Comparison Mode

**Why**: "Run Mirror before your fix, fix the issue, run Mirror again — see the delta." This is the feature that makes teams adopt Mirror permanently.

**What to build**:
- `POST /api/v1/studies/{id}/compare/{other_id}` — Compare two study runs
- Returns: score delta, issues fixed, issues introduced, persona comparison
- The synthesis prompt gets both study results and produces a diff analysis

**Files**:
- CREATE `backend/app/core/comparator.py`
- CREATE `backend/app/api/v1/compare.py`
- MODIFY `backend/app/llm/prompts.py` (add comparison prompt)
- MODIFY `backend/app/llm/schemas.py` (add `ComparisonResult` model)

---

### 3.2 Competitive Benchmarking

**Why**: "Your signup flow scores 62/100. Your competitor scores 84/100. Here's why." This is the feature that sells the product.

**What to build**:
- Study creation accepts multiple URLs: `{"urls": ["mysite.com", "competitor.com"]}`
- Run same personas on both sites with same tasks
- Cross-site synthesis: "Your competitor uses clearer labels, shorter forms"
- Side-by-side comparison in results

**Files**:
- MODIFY `backend/app/models/study.py` (support multiple URLs or linked studies)
- CREATE `backend/app/core/benchmark.py`
- MODIFY `backend/app/llm/prompts.py` (add competitive analysis prompt)
- MODIFY `backend/app/api/v1/studies.py` (support benchmark mode)

---

### 3.3 CLI Tool — `mirror test <url>`

**Why**: Developers love CLIs. Also enables CI/CD integration. "Add one line to your GitHub Action and get UX testing on every PR."

**What to build**: A Python CLI that calls the Mirror API:

```bash
$ mirror test https://mysite.com --task "Sign up for account" --personas 5
🔍 Crawling mysite.com...
👥 Generating 5 personas...
🌐 Running sessions... [████████░░] 80%
✅ Study complete! Score: 72/100
📊 14 issues found (3 critical, 5 major, 4 minor, 2 enhancements)

Top 3 Issues:
  🔴 #1 "Workspace" label confuses non-technical users
  🟠 #2 Social login hidden below the fold
  🟠 #3 Phone number required in signup form

Full report: https://mirror.dev/study/abc123
```

**Files**:
- CREATE `backend/cli/` directory
- CREATE `backend/cli/mirror_cli.py` (Click-based CLI)
- CREATE `backend/cli/setup.py` (pip installable)

---

### 3.4 GitHub Action for CI/CD UX Testing

**Why**: "Block merges on UX regressions" — this is the killer enterprise feature.

**What to build**:

```yaml
# .github/actions/mirror-test/action.yml
name: Mirror UX Test
inputs:
  url: { required: true }
  tasks: { required: true }
  api-key: { required: true }
  fail-below-score: { default: 60 }
runs:
  using: composite
  steps:
    - run: mirror test ${{ inputs.url }} --task "${{ inputs.tasks }}" --fail-below ${{ inputs.fail-below-score }}
```

**Files**:
- CREATE `.github/actions/mirror-test/action.yml`
- CREATE `.github/actions/mirror-test/entrypoint.sh`

---

## PRIORITY 4 — HARDENING & POLISH (Days 12-14)

### 4.1 Integration Test Suite

**Why**: Unit tests pass, but does the full pipeline actually work? Build E2E tests that:

1. Start the demo site
2. Create a study via API
3. Run the study (with mocked LLM to avoid cost)
4. Verify steps are in DB
5. Verify issues are detected
6. Verify heatmap data exists
7. Verify report is generated
8. Verify WebSocket events were published

**Files**:
- CREATE `backend/tests/test_integration/test_full_study.py`
- CREATE `backend/tests/test_integration/conftest.py`
- CREATE `backend/tests/test_integration/mock_llm.py` (deterministic LLM responses)

---

### 4.2 Error Recovery & Resilience

**What to harden**:
- Cookie consent auto-dismissal (detect common consent frameworks: OneTrust, CookieBot)
- Auth wall detection (detect login redirects, return helpful error)
- CAPTCHA detection (detect reCAPTCHA, hCaptcha — report as "blocked")
- Playwright crash recovery (if browser context dies, recreate and continue)
- LLM response validation (if JSON parse fails, retry with clearer instructions)
- Rate limit budgeting (track Anthropic rate limits, queue accordingly)

**Files**:
- CREATE `backend/app/browser/cookie_consent.py`
- CREATE `backend/app/browser/detection.py` (auth walls, CAPTCHAs)
- MODIFY `backend/app/core/navigator.py` (add cookie/auth/captcha handling)
- MODIFY `backend/app/llm/client.py` (add response validation retry)

---

### 4.3 Cloudflare R2 Storage

**Why**: Screenshots in session replays = lots of image loads. R2 has zero egress fees. Plus it's production-grade.

**What to build**: Update `FileStorage` to support R2:

```python
class R2Storage(FileStorage):
    """S3-compatible storage using Cloudflare R2."""
    def __init__(self):
        self._client = boto3.client('s3',
            endpoint_url=os.getenv('R2_ENDPOINT_URL'),
            aws_access_key_id=os.getenv('R2_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('R2_SECRET_ACCESS_KEY'),
        )
```

**Files**:
- MODIFY `backend/app/storage/file_storage.py` (add R2 implementation)
- MODIFY `backend/app/dependencies.py` (auto-select storage backend)
- MODIFY `backend/pyproject.toml` (add `boto3` dependency)

---

### 4.4 Study Cost Estimation

**Why**: "This study will cost approximately $0.45" before you run it. Shows maturity.

**What to build**:
```
GET /api/v1/studies/{id}/estimate
→ {
    "estimated_cost_usd": 0.45,
    "breakdown": {
      "persona_generation": 0.05,
      "navigation_steps": 0.28,
      "screenshot_analysis": 0.08,
      "synthesis": 0.03,
      "report": 0.01
    },
    "estimated_duration_seconds": 180,
    "estimated_api_calls": 47
  }
```

Based on: personas × tasks × avg_steps × cost_per_model_per_1k_tokens.

**Files**:
- CREATE `backend/app/services/cost_estimator.py`
- MODIFY `backend/app/api/v1/studies.py` (add estimate endpoint)

---

## TASK CHECKLIST

### Day 1 — Critical Path (MUST DO)
- [ ] 0.1 Implement StepRecorder (wire navigation → DB + storage)
- [ ] 0.2 Wire custom persona generation endpoint
- [ ] 0.3 Wire insights to database after synthesis
- [ ] Verify: full study run produces visible results in API

### Days 2-4 — Demo Killers
- [ ] 1.1 Build demo website with 10 planted UX issues
- [ ] 1.2 Firecrawl integration for site pre-crawling
- [ ] 1.3 Langfuse integration for LLM observability
- [ ] 1.4 Enrich real-time WebSocket events

### Days 5-8 — Intelligence Depth
- [ ] 2.1 Issue deduplication across studies
- [ ] 2.2 Severity calibration / smart ranking
- [ ] 2.3 Emotional journey API endpoint
- [ ] 2.4 Scroll depth tracking
- [ ] 2.5 Page load performance tracking

### Days 9-11 — Competitive Edge
- [ ] 3.1 Before/after comparison mode
- [ ] 3.2 Competitive benchmarking
- [ ] 3.3 CLI tool (`mirror test <url>`)
- [ ] 3.4 GitHub Action for CI/CD

### Days 12-14 — Hardening
- [ ] 4.1 Integration test suite (E2E)
- [ ] 4.2 Error recovery (cookie consent, auth walls, CAPTCHAs)
- [ ] 4.3 Cloudflare R2 storage
- [ ] 4.4 Study cost estimation

---

## WHAT MAKES THIS WIN

| Hackathon Criterion | What Impresses Judges |
|--------------------|-----------------------|
| **Demo (30%)** | Live personas navigating the demo site, emotional arcs changing in real-time, one persona giving up, before/after comparison showing improvement |
| **Opus 4.6 Usage (25%)** | 5 pipeline stages, multimodal vision, deep persona reasoning, cross-persona synthesis, competitive analysis, Langfuse dashboard showing 200+ calls per study |
| **Impact (25%)** | "$12K → $0.50, 6 weeks → 5 minutes", CI/CD integration, CLI tool, competitive benchmarking — not just a demo, a real product |
| **Depth (20%)** | Issue dedup, scroll depth, performance tracking, emotional journeys, planted-issue demo site, R2 storage, cost estimation — every detail polished |

---

## NON-GOALS (Don't waste time on)

- ❌ Authentication / Clerk integration (not needed for hackathon demo)
- ❌ Team workspaces / RBAC (post-hackathon)
- ❌ GraphQL API (REST is fine)
- ❌ Scheduled studies / cron (post-hackathon)
- ❌ Marketplace / plugins (post-hackathon)
- ❌ SSO / SAML / SOC 2 (enterprise, post-launch)
- ❌ i18n / locale support (post-launch)

**Focus on what makes the demo sing and the product feel complete.**
