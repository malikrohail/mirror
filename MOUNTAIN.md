# MOUNTAIN.md — Mirror End-to-End Work Plan

**Created:** 2026-02-15
**Status:** Planning
**Scope:** All remaining "Not Done" items + production fixes from FIXES.md

---

## Overview

This plan covers 3 categories of work across 5 parallel agent tracks:

| Category | Items | Priority |
|----------|-------|----------|
| **Production Fixes** | Screenshot serving, heatmap, replay | P0 — Blocking |
| **New Backend APIs** | Cost estimate, team mgmt, preferences, favorites, naming | P1 — Core |
| **System Improvements** | Persona normalization, model selection, issue types, api-client cleanup, showcase study | P2 — Important |

---

## Agent Assignments

| Agent | Track | Focus Area | Estimated Scope |
|-------|-------|------------|-----------------|
| **Agent 1** | Track A | Critical Fixes (screenshot, heatmap, replay) | ~6 files |
| **Agent 2** | Track B | New Backend APIs (5 endpoints) | ~12 files |
| **Agent 3** | Track C | Persona System (normalize profiles + model selection) | ~8 files |
| **Agent 4** | Track D | Issue Type Categorization (full-stack) | ~9 files |
| **Agent 5** | Track E | Frontend Cleanup (api-client wiring + showcase study) | ~10 files |

**Parallelism:** Tracks A, B, D, E can all run in parallel. Track C should start after Track B lays groundwork for persona endpoints.

---

## Track A — Critical Fixes (Agent 1)

> **Goal:** Fix screenshot serving, heatmap rendering, and session replay.
> **Priority:** P0 — these are broken in production at miror.tech
> **Dependencies:** None — can start immediately

### A1. Fix Screenshot Serving (unblocks heatmap + replay)

**Problem:** Screenshot paths stored in DB as `studies/{id}/sessions/{id}/steps/step_001.png` may not resolve correctly through the API. Docker mounts data at `/app/data`, so the full path must be `/app/data/studies/...`.

**Files:**
- `backend/app/api/v1/screenshots.py` (~line 1-39) — verify `serve_screenshot()` resolves paths against `STORAGE_PATH`
- `backend/app/storage/file_storage.py` (~line 69-92) — verify `get_screenshot_full_path()` joins `base_path + relative_path` correctly
- Verify the path stored in `steps.screenshot_path` matches what the screenshot API expects

**Verification:**
```bash
# Test locally
curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/api/v1/screenshots/studies/{study_id}/sessions/{session_id}/steps/step_001.png
```

### A2. Fix Heatmap Click Coordinates

**Problem:** Some click actions have `click_x = NULL` because the navigator only captures click position when the CSS selector resolves. If selector fails, coordinates are skipped.

**Files:**
- `backend/app/core/navigator.py` (~line 435-450) — in `_execute_action()`, add fallback for click coordinates:
  1. Try element bounding box from selector (current behavior)
  2. If selector fails, try accessibility tree position
  3. Last resort: use viewport center as approximate position
- `backend/app/services/session_service.py` — verify `get_heatmap_data()` filters out NULL coordinates properly

**Code pattern:**
```python
# In _execute_action(), before saving the step:
click_x, click_y = None, None
if action_type == "click" and selector:
    try:
        click_x, click_y = await self._screenshots.get_click_position(page, selector)
    except Exception:
        viewport = page.viewport_size
        if viewport:
            click_x = viewport["width"] // 2
            click_y = viewport["height"] // 2
```

### A3. Fix Heatmap Frontend Empty State

**Problem:** When no click data exists, the heatmap renders but is invisible (no background image, no data points).

**Files:**
- `frontend/src/components/heatmap/click-heatmap.tsx` — add meaningful empty state when `data_points.length === 0`
- Verify `page_screenshots` URLs resolve (they use the same screenshot API from A1)

### A4. Fix Session Replay Step Navigation

**Problem:** Replay may show only one screenshot if `session.steps` array isn't fully populated in the API response.

**Files:**
- `frontend/src/components/session/session-replay.tsx` — verify `api.listSteps(sessionId)` returns all steps
- `backend/app/api/v1/sessions.py` — verify the steps endpoint returns all steps without pagination truncation
- `frontend/src/components/session/step-controls.tsx` — verify controls render when `totalSteps > 0`

**Verification:**
```bash
curl -s http://localhost:8000/api/v1/sessions/{session_id}/steps | python3 -c "
import sys, json; d = json.load(sys.stdin)
print(f'Steps: {len(d)}')
for s in d: print(f'  Step {s[\"step_number\"]}: {s.get(\"screenshot_path\", \"NONE\")[:60]}')
"
```

### A-Checklist

- [ ] A1: Screenshot paths resolve end-to-end (backend storage → API → frontend URL)
- [ ] A2: Click coordinates captured even when selector fails
- [ ] A3: Heatmap shows empty state when no data
- [ ] A4: Replay navigates through all steps with screenshots loading

---

## Track B — New Backend APIs (Agent 2)

> **Goal:** Implement 5 new backend endpoints + wire server-side test naming
> **Priority:** P1 — core functionality gaps
> **Dependencies:** None — can start immediately

### B1. Lightweight Cost Estimate Endpoint

**Problem:** Cost/duration estimates only work for saved studies. Users need estimates on the "New Test" page as they add personas/tasks, before saving anything.

**What to build:**
- `POST /api/v1/estimate` — accepts persona count, task count, model choices; returns estimated cost + duration
- No database interaction — pure calculation based on:
  - Model pricing (Opus ~$0.40/session, Sonnet ~$0.08/session, configurable)
  - Steps per session estimate (~15 avg)
  - Analysis overhead (synthesis, report gen)
  - Parallel execution time estimate

**Files to create/modify:**
- `backend/app/api/v1/estimate.py` — new endpoint file
- `backend/app/api/router.py` — mount the new router
- `backend/app/schemas/study.py` — add `EstimateRequest` / `EstimateResponse` schemas

**Schema:**
```python
class EstimateRequest(BaseModel):
    persona_count: int
    task_count: int
    models: list[str] = ["opus-4.6"]  # per-persona model choices
    url: str | None = None  # optional, for site complexity estimation

class EstimateResponse(BaseModel):
    estimated_cost_usd: float
    estimated_duration_seconds: int
    breakdown: dict  # per-model costs, per-phase costs
```

### B2. Team Management API

**Problem:** "Your Team" (personas selected as go-to testers) is stored in localStorage. Lost on browser clear or device switch.

**What to build:**
- `GET /api/v1/teams` — list user's team personas
- `POST /api/v1/teams` — add persona to team
- `DELETE /api/v1/teams/{persona_id}` — remove from team
- `PUT /api/v1/teams/reorder` — update team order

**Files to create/modify:**
- `backend/app/models/team.py` — new model: `user_teams` table (user_id, persona_template_id, order_index)
- `backend/app/api/v1/teams.py` — new endpoint file
- `backend/app/api/router.py` — mount the new router
- `backend/app/schemas/persona.py` — add team-related schemas
- `backend/alembic/versions/` — new migration for `user_teams` table

**Note:** Since auth uses Clerk, `user_id` comes from the Clerk JWT. For now, if auth isn't fully wired, use a header-based user_id or default user.

### B3. User Preferences API

**Problem:** Browser mode preference (local vs cloud) is stored in localStorage. Lost on browser clear or device switch.

**What to build:**
- `GET /api/v1/preferences` — get user preferences
- `PUT /api/v1/preferences` — update preferences
- Preferences include: `browser_mode` ("local" | "cloud"), `theme` ("light" | "dark" | "system"), `default_model`, `notifications_enabled`

**Files to create/modify:**
- `backend/app/models/preference.py` — new model: `user_preferences` table (user_id, preferences JSONB)
- `backend/app/api/v1/preferences.py` — new endpoint file
- `backend/app/api/router.py` — mount
- `backend/app/schemas/preference.py` — new schemas
- `backend/alembic/versions/` — new migration

### B4. Browser Favorites API

**Problem:** Bookmarked test URLs are stored in localStorage. Lost on browser clear or device switch.

**What to build:**
- `GET /api/v1/favorites` — list favorite URLs
- `POST /api/v1/favorites` — add favorite (url, label, notes)
- `DELETE /api/v1/favorites/{id}` — remove favorite
- `PUT /api/v1/favorites/{id}` — update label/notes

**Files to create/modify:**
- `backend/app/models/favorite.py` — new model: `browser_favorites` table (user_id, url, label, notes, created_at)
- `backend/app/api/v1/favorites.py` — new endpoint file
- `backend/app/api/router.py` — mount
- `backend/app/schemas/favorite.py` — new schemas
- `backend/alembic/versions/` — new migration

### B5. Server-Side Test Naming

**Problem:** Test names like "google-1", "google-2" are computed client-side by fetching ALL studies and counting by hostname. Fragile and slow.

**What to build:**
- Add `name` column to `studies` table
- Backend auto-generates the name on study creation:
  1. Extract hostname from URL (strip www, subdomains → base domain)
  2. Count existing studies with same base domain
  3. Set name to `{domain}-{count + 1}` (e.g., "google-3")
- Return `name` in all study responses
- Frontend reads `study.name` instead of computing it

**Files to create/modify:**
- `backend/app/models/study.py` — add `name: Mapped[str]` column
- `backend/app/services/study_service.py` — auto-generate name in `create_study()`
- `backend/app/schemas/study.py` — add `name` to `StudyOut`
- `backend/alembic/versions/` — new migration (add column + backfill existing studies)
- `frontend/src/lib/utils.ts` — deprecate `studyName()` / `studyBaseName()` (lines 8-30)
- `frontend/src/app/study/[id]/running/page.tsx` — use `study.name` from API

### B-Checklist

- [ ] B1: Cost estimate endpoint works without a saved study
- [ ] B2: Team personas persist server-side per user
- [ ] B3: User preferences persist server-side per user
- [ ] B4: Browser favorites persist server-side per user
- [ ] B5: Study names auto-generated server-side on creation

---

## Track C — Persona System (Agent 3)

> **Goal:** Normalize persona profile types + wire model selection end-to-end
> **Priority:** P2 — data quality + feature completion
> **Dependencies:** Should run after Track B starts (B2 touches persona schemas)

### C1. Normalize Persona Profiles

**Problem:** Backend returns inconsistent types for `default_profile`:
- `tech_literacy`: sometimes string `"low"`, sometimes number `3`
- `patience_level`: sometimes string `"high"`, sometimes `8`
- `accessibility_needs`: sometimes array `["large text"]`, sometimes object `{screen_reader: true}`
- `reading_speed`: sometimes `"skims"`, sometimes `2`

**Decision:** Use **numbers (1-10)** for all level fields, **flat string arrays** for list fields.

**Canonical schema:**
```python
class PersonaProfile(BaseModel):
    age: int
    gender: str
    occupation: str
    tech_literacy: int          # 1-10 scale (1=novice, 10=expert)
    patience_level: int         # 1-10 scale (1=very impatient, 10=very patient)
    reading_speed: int          # 1-10 scale (1=skims, 10=reads everything)
    trust_level: int            # 1-10 scale (1=skeptical, 10=trusting)
    device_preference: str      # "mobile" | "desktop" | "tablet"
    accessibility_needs: list[str]  # flat array: ["screen_reader", "large_text", "high_contrast"]
    goals: list[str]
    frustrations: list[str]
    behavioral_traits: list[str]
```

**Files to modify:**
- `backend/app/data/persona_templates.json` — convert ALL 20+ templates to canonical format:
  - String levels → numbers (map: "very_low"=1, "low"=3, "moderate"=5, "high"=7, "very_high"=10, etc.)
  - Object `accessibility_needs` → flat arrays
- `backend/app/schemas/persona.py` — enforce canonical types in Pydantic schemas
  - `PersonaGenerationOptions` (lines 52-56): already uses 1-10 ✓
  - `PersonaAccessibilityOptions` (lines 42-48): change to `list[str]`
- `backend/app/llm/schemas.py` — update `PersonaProfile` in LLM response schemas to match
- `backend/app/llm/prompts.py` — update persona generation prompt to output numbers + flat arrays
- `backend/app/services/persona_service.py` — add normalization layer that converts any legacy format to canonical on read
- `frontend/src/types/index.ts` — update `PersonaProfile` type
- `frontend/src/components/persona/persona-builder-form.tsx` — ensure form outputs canonical format

**Migration strategy:** Add a normalization function in `persona_service.py` that runs on read. No DB migration needed since profiles are JSONB — just ensure all new writes use the canonical format and reads normalize on the fly.

### C2. Per-Persona Model Selection (Backend)

**Problem:** Model is hardcoded to "Opus 4.6" and cost to $0.40 for every persona. The persona builder UI has model selection (line 661-691 in `persona-builder-form.tsx`) but it's not sent to the backend.

**What to build:**
- Add `model` field to persona model/schema
- Store the selected model when creating custom personas
- Return the actual model in persona API responses
- Calculate cost based on actual model choice

**Files to modify:**
- `backend/app/models/persona.py` — add `model: Mapped[str | None]` column (default "opus-4.6")
- `backend/app/schemas/persona.py` — add `model` to `PersonaGenerateRequest` and `PersonaOut`
- `backend/app/services/persona_service.py` — persist model choice on creation
- `backend/app/core/orchestrator.py` — use persona's model when running sessions instead of global default
- `backend/alembic/versions/` — new migration (add model column to personas)

**Model pricing map (for cost calculation):**
```python
MODEL_COSTS = {
    "opus-4.6": 0.40,      # ~$0.40 per session
    "sonnet-4.5": 0.08,    # ~$0.08 per session
    "haiku-4.5": 0.02,     # ~$0.02 per session
}
```

### C3. Per-Persona Model Selection (Frontend Wiring)

**Problem:** The persona builder form has a `selectedModel` state (line 384) and UI dropdown (lines 661-691) but doesn't send it in the `PersonaGenerateRequest` payload (lines 477-496).

**Files to modify:**
- `frontend/src/components/persona/persona-builder-form.tsx`:
  - Add `model` to the generate request payload (~line 477-496)
  - Display actual model cost instead of hardcoded $0.40
- `frontend/src/types/index.ts` — add `model` to persona types
- `frontend/src/lib/api-client.ts` — update `generatePersona()` to include model param
- `frontend/src/components/persona/persona-card.tsx` — show model badge on persona cards

### C-Checklist

- [ ] C1: All persona profiles use consistent types (numbers for levels, arrays for lists)
- [ ] C2: Backend stores and returns per-persona model choice
- [ ] C3: Frontend sends model selection to backend and displays real costs

---

## Track D — Issue Type Categorization (Agent 4)

> **Goal:** Add full-stack issue type categorization (UX / Accessibility / Error / Performance)
> **Priority:** P2 — enhances analysis quality
> **Dependencies:** None — can start immediately

**NOTE:** The exploration found that `issue_type` may **already exist** on the Issue model (`backend/app/models/issue.py`). Agent 4 should first verify what's already implemented and only build what's missing.

### D1. Verify Current State

Check if `issue_type` column already exists in:
- `backend/app/models/issue.py` — does the column exist?
- `backend/app/schemas/session.py` — is `issue_type` in `IssueOut`?
- `backend/app/llm/schemas.py` — does `UXIssue` include `issue_type`?
- `backend/app/llm/prompts.py` — do prompts instruct the LLM to classify issue types?
- `frontend/src/types/index.ts` — is `IssueType` defined?
- `frontend/src/components/results/issues-tab.tsx` — is there a type filter?

### D2. Database (if needed)

If `issue_type` column doesn't exist:
- Create migration: `backend/alembic/versions/XXX_add_issue_type.py`
- Add column with default `"ux"`, backfill existing issues based on heuristic/wcag fields

### D3. Backend Model + Schema (if needed)

- `backend/app/models/issue.py` — add `IssueType` enum + `issue_type` column
- `backend/app/schemas/session.py` — add `issue_type` to `IssueOut`

### D4. LLM Integration (if needed)

- `backend/app/llm/schemas.py` — add `issue_type` to `UXIssue` response schema
- `backend/app/llm/prompts.py` — add classification instructions:
  ```
  For each issue, classify its type:
  - "ux" — general usability (layout, flow, clarity, readability, consistency)
  - "accessibility" — WCAG/a11y issues (contrast, keyboard nav, screen reader, alt text)
  - "error" — broken functionality (failed clicks, 404s, unresponsive elements, JS errors)
  - "performance" — slow loads, lag, timeouts, large images, render blocking
  ```

### D5. API Endpoint Filter (if needed)

- `backend/app/api/v1/sessions.py` — add `issue_type` query param to `list_issues()`
  ```python
  if issue_type:
      query = query.where(Issue.issue_type == issue_type)
  ```

### D6. Frontend Type Filter + Badges (if needed)

- `frontend/src/types/index.ts` — add `IssueType` union type
- `frontend/src/components/results/issues-tab.tsx` — add type filter dropdown alongside severity filter
- `frontend/src/components/results/issue-card.tsx` — add colored type badge:
  ```
  UX → blue | Accessibility → purple | Error → red | Performance → amber
  ```

### D-Checklist

- [ ] D1: Audit what's already implemented
- [ ] D2: DB migration (if needed)
- [ ] D3: Backend model + schema (if needed)
- [ ] D4: LLM prompts classify issue types
- [ ] D5: API supports `issue_type` filter
- [ ] D6: Frontend shows type filter + badges

---

## Track E — Frontend Cleanup (Agent 5)

> **Goal:** Wire raw fetch() into api-client + build showcase study
> **Priority:** P2 — code quality + marketing feature
> **Dependencies:** None — can start immediately

### E1. Wire Raw fetch() Calls into api-client.ts

**Problem:** ~6 components use raw `fetch()` instead of the typed `api-client.ts`. They work but aren't typed or centralized.

**Files with raw fetch to fix:**
1. `frontend/src/app/study/[id]/running/page.tsx` (~line 420) — report markdown fetch
2. `frontend/src/components/results/flow-issues-tab.tsx` — flow analysis fetch
3. `frontend/src/components/report/report-preview.tsx` — report preview fetch
4. `frontend/src/app/tests/page.tsx` — tests page fetch
5. `frontend/src/components/results/fix-preview.tsx` — fix preview fetch
6. `frontend/src/components/results/accessibility-tab.tsx` — accessibility tab fetch

**For each file:**
1. Identify the raw `fetch()` call and what endpoint it hits
2. Add a typed method to `frontend/src/lib/api-client.ts` if one doesn't exist
3. Replace the raw `fetch()` with the typed api-client method
4. Ensure proper TypeScript types for request/response

**Files to modify:**
- `frontend/src/lib/api-client.ts` — add any missing endpoint methods
- All 6 files above — replace `fetch()` with `api.methodName()`

### E2. Showcase Study (Case Study Demo)

**Problem:** New users have no way to see what Mirror produces. Need a pre-built, fully completed demo study that new users can explore (scores, issues, heatmaps, replays, report). The "Case Study" button on the homepage should link to it. It should NOT appear in the user's "My Tests" list.

**What to build:**

**Backend:**
- `backend/app/data/showcase_study.json` — pre-built study data (all entities: study, tasks, personas, sessions, steps, issues, insights) with realistic results
- `GET /api/v1/showcase` — returns the showcase study data (no auth required)
- `backend/app/api/v1/showcase.py` — new endpoint that serves the demo data
- `backend/app/api/router.py` — mount
- Showcase study should have a fixed UUID so it's always the same

**Frontend:**
- `frontend/src/app/showcase/page.tsx` — showcase study results page (reuses existing results components)
- Update homepage "Case Study" button to link to `/showcase`
- In study list pages, filter out the showcase study UUID
- `frontend/src/lib/api-client.ts` — add `getShowcaseStudy()` method

**Demo study content ideas:**
- URL: `https://example-ecommerce.com` (or a real public site)
- 3 personas: tech-savvy millennial, elderly retiree, screen reader user
- 2 tasks: "Find and purchase a product", "Find the return policy"
- Realistic scores (~68/100), 8-12 issues across types, comparative insights
- Pre-generated screenshots (can be placeholder images)

### E-Checklist

- [ ] E1: All raw fetch() calls replaced with typed api-client methods
- [ ] E2: Showcase study accessible at /showcase with full demo data

---

## Execution Order

```
TIME ──────────────────────────────────────────────────────────────►

Phase 1 (Parallel — all can start immediately):
  Agent 1: [A1: Screenshot fix] → [A2: Heatmap coords] → [A3: Empty state] → [A4: Replay]
  Agent 2: [B1: Cost estimate] → [B2: Team API] → [B3: Preferences] → [B4: Favorites] → [B5: Naming]
  Agent 4: [D1: Audit] → [D2-D6: Build what's missing]
  Agent 5: [E1: API client wiring] → [E2: Showcase study]

Phase 2 (After Agent 2 starts):
  Agent 3: [C1: Normalize profiles] → [C2: Model selection BE] → [C3: Model selection FE]
```

---

## Migrations Summary

All new migrations needed (Track B + C + D):

| Migration | Table | Change |
|-----------|-------|--------|
| B2 | `user_teams` | New table (user_id, persona_template_id, order_index) |
| B3 | `user_preferences` | New table (user_id, preferences JSONB) |
| B4 | `browser_favorites` | New table (user_id, url, label, notes) |
| B5 | `studies` | Add `name` column + backfill |
| C2 | `personas` | Add `model` column (nullable, default "opus-4.6") |
| D2 | `issues` | Add `issue_type` column (if not already present) |

**Important:** Migrations should be numbered sequentially. Coordinate ordering if running agents in parallel.

---

## Testing Strategy

Each track should include:
1. **Backend:** pytest tests for new endpoints/services
2. **Frontend:** Manual verification that UI renders correctly
3. **Integration:** End-to-end test via the running app

**Smoke test after all tracks complete:**
```bash
# 1. Backend health
curl http://localhost:8000/api/v1/health

# 2. Cost estimate (no saved study)
curl -X POST http://localhost:8000/api/v1/estimate -H "Content-Type: application/json" -d '{"persona_count": 3, "task_count": 2}'

# 3. Screenshot serving
curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/api/v1/screenshots/studies/{id}/sessions/{id}/steps/step_001.png

# 4. Heatmap data
curl http://localhost:8000/api/v1/studies/{id}/heatmap

# 5. Showcase study
curl http://localhost:8000/api/v1/showcase

# 6. Persona with model
curl http://localhost:8000/api/v1/personas/{id}  # should include "model" field
```

---

## Files Changed Summary

| Track | New Files | Modified Files | Total |
|-------|-----------|---------------|-------|
| A (Fixes) | 0 | ~6 | ~6 |
| B (APIs) | ~10 (endpoints, models, schemas, migrations) | ~5 (router, study model/service) | ~15 |
| C (Persona) | ~1 (migration) | ~8 (templates, schemas, services, frontend) | ~9 |
| D (Issues) | ~1 (migration, if needed) | ~6-8 (model, schema, prompts, API, frontend) | ~7-9 |
| E (Cleanup) | ~2 (showcase endpoint, showcase page) | ~8 (api-client, 6 fetch files, homepage) | ~10 |
| **Total** | **~14** | **~33** | **~47** |
