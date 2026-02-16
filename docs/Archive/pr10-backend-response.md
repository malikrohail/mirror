# PR #10 Backend Response — Action Plan

> Addressing all backend tasks, bugs, and questions raised in [PR #10](https://github.com/malikrohail/mirror/pull/10) ("Frontend UI redesign: study results, findings tab, report rendering") and the full inventory in `frontend/BACKEND_TASKS.md`.

---

## Critical & High Priority

### 1. BUG: Delete test fails (FK cascade) — CRITICAL

**Problem:** `DELETE /studies/{id}` errors out because `study_repo.delete()` does a simple `session.delete(study)` with no cascade handling. Child records (sessions, steps, issues, insights, personas, tasks) block deletion via FK constraints.

**Plan:**
- Add `cascade="all, delete-orphan"` to all relationships on the `Study` model (`tasks`, `personas`, `sessions`, `issues`, `insights`)
- Also add cascade on `Session` model for its `steps` and `issues` relationships
- Add cleanup of screenshot files from `data/studies/{study_id}/` in `study_service.delete_study()`
- Files to modify:
  - `backend/app/models/study.py` — add cascade to relationships
  - `backend/app/models/session.py` — add cascade to step/issue relationships
  - `backend/app/services/study_service.py` — add file cleanup after DB delete

---

### 2. BUG: No steps saved during test run — HIGH

**Problem:** Steps feed is empty. `GET /sessions/{id}/steps` returns nothing. WebSocket `session:step` events not firing. Steps are either not being persisted during navigation or not being pushed via WS.

**Plan:**
- Audit `backend/app/core/navigator.py` — verify the RECORD phase is actually calling `session.add()` + `commit()` for each step
- Verify that the background `_record_step_background()` (added in PR #7) isn't silently failing (swallowed exceptions in `asyncio.create_task`)
- Ensure WS `session:step` events are being published to Redis pubsub after each step is recorded
- Add structured logging per step: `[persona_name] Step {n}: {action_type} on {page_url} — {success/failure}`
- Files to audit:
  - `backend/app/core/navigator.py` — step recording + WS publish
  - `backend/app/core/orchestrator.py` — session lifecycle
  - `backend/app/api/ws/progress.py` — WS event forwarding
  - `backend/app/workers/tasks.py` — background task execution

---

### 3. Replace plan generation with AI persona selection — HIGH

**Problem:** Current `POST /studies/plan` generates a full plan via LLM with creative persona names that rarely match templates. The partial fix in `test_planner.py` (keyword overlap + fallback to first 3 templates) is a band-aid.

**Plan:** Build a new `POST /api/v1/personas/recommend` endpoint:
- Accepts `{ url: string, task_description: string }`
- Fetches all persona templates from DB
- Sends URL + task + full persona list to LLM (Sonnet for speed)
- LLM returns the 5 best-fitting `template_id`s with reasoning
- Response includes real template_ids — no matching needed
- Returns: `{ personas: [{ template_id, name, emoji, reason }, ...] }`
- Files to create/modify:
  - `backend/app/api/v1/personas.py` — new `/recommend` endpoint
  - `backend/app/services/persona_service.py` — new `recommend_personas()` method
  - `backend/app/llm/prompts.py` — new prompt for persona selection
  - `backend/app/llm/schemas.py` — new response schema
- Frontend will call this instead of `generateStudyPlan()`
- Can deprecate `POST /studies/plan` and `test_planner.py` once this is live

---

### 4. BUG: Selecting different tester doesn't change browser/steps — HIGH

**Problem:** Live state is not per-session. Each persona session needs its own screencast, screenshots, and step history.

**Plan:**
- Verify `GET /api/v1/studies/{id}/live-state` returns data keyed by `session_id` (not shared)
- Ensure each Playwright browser instance stores screenshots under its own session path
- Verify WS `session:step` events include `session_id` so frontend can filter
- Verify screencast WS stream is per-session, not per-study
- Files to audit:
  - `backend/app/core/orchestrator.py` — session creation + browser assignment
  - `backend/app/api/v1/studies.py` — live-state endpoint response shape
  - `backend/app/api/ws/progress.py` — WS event routing per session
  - `backend/app/browser/pool.py` — browser instance isolation

---

### 5. Showcase study (case study demo) — HIGH

**Problem:** Homepage needs a "Case Study" button linking to a pre-built, fully completed study. Must NOT appear in user's "My Tests" list.

**Plan:**
- Add `is_showcase` boolean column to `studies` table (default `false`)
- Filter `is_showcase=true` studies out of `GET /api/v1/studies` (user's list)
- Add `GET /api/v1/studies/showcase` endpoint that returns the showcase study
- Create a seed script/migration that inserts a complete showcase study with:
  - 3-5 persona sessions with real screenshots, steps, think-aloud
  - Issues across all severity levels
  - Insights (universal, persona-specific, comparative, recommendations)
  - Heatmap data for 2-3 pages
  - Generated report (PDF + Markdown)
- Files to create/modify:
  - `backend/alembic/versions/XXX_add_showcase_flag.py` — migration
  - `backend/app/models/study.py` — add `is_showcase` column
  - `backend/app/api/v1/studies.py` — filter in list, new showcase endpoint
  - `backend/app/data/seed_showcase.py` — seed script (new)
  - `Makefile` — add `make seed-showcase` command

---

### 6. Lightweight cost estimate — HIGH

**Problem:** "New test" page header shows estimated runtime and cost while user configures personas/tasks. Currently hardcoded to `$0.40 * personas * tasks`.

**Plan:**
- Add `GET /api/v1/studies/estimate?personas={n}&tasks={n}` (no saved study needed)
- Reuse existing `CostEstimator` service math
- Response: `{ estimated_cost_usd, estimated_duration_seconds, breakdown: { persona_generation, navigation_steps, screenshot_analysis, synthesis, report } }`
- Files to modify:
  - `backend/app/api/v1/studies.py` — new `/estimate` query endpoint
  - `backend/app/services/cost_estimator.py` — expose a `quick_estimate(n_personas, n_tasks)` method

---

### 7. Per-persona model & cost in template response — HIGH

**Problem:** Persona table shows "Model" and "Cost" columns, currently hardcoded to "Opus 4.6" and "$0.40" for every row.

**Plan:**
- Add to `PersonaTemplateOut` schema: `model` (str), `model_display_name` (str), `estimated_cost_per_run_usd` (float)
- Populate from config (model routing rules) + CostEstimator
- Optionally add columns to `persona_templates` table if per-template model assignment is desired, otherwise derive from app config
- Files to modify:
  - `backend/app/schemas/persona.py` — add fields to `PersonaTemplateOut`
  - `backend/app/services/persona_service.py` — compute/attach cost + model fields
  - Maybe `backend/app/models/persona.py` — if adding DB columns

---

## Medium Priority

### 8. Browser viewport wrong resolution — MEDIUM

**Problem:** Playwright renders pages zoomed in. Screenshots show only top-left portion of the page.

**Plan:**
- Set viewport to `1280x720` (or `1440x900`) when creating Playwright browser contexts
- Check Browserbase session config for viewport dimensions
- Files to modify:
  - `backend/app/browser/pool.py` — set `viewport` in `browser.new_context()`
  - `backend/app/core/navigator.py` — if viewport is set per-session

---

### 9. Normalize persona profile types — LOW

**Problem:** `default_profile` returns mixed types — `tech_literacy` can be string "low" or number 3, `accessibility_needs` can be array or object. Frontend has duplicated normalization logic in two files.

**Plan:**
- Normalize in `PersonaService` or in the Pydantic schema serializer so API always returns:
  - `tech_literacy: number` (1-10)
  - `patience_level: number` (1-10)
  - `accessibility_needs: string[]` (flat array)
- Files to modify:
  - `backend/app/schemas/persona.py` — add validators/serializers
  - `backend/app/services/persona_service.py` — normalize on read
  - `backend/app/llm/prompts.py` — ensure persona generation prompt specifies numeric ranges

---

## Lower Priority

### 10. Team management API — MEDIUM

**Problem:** "Your Team" (selected personas) stored in `localStorage`. Doesn't sync across devices.

**Plan:**
- `GET /api/v1/users/me/team` — returns `{ persona_ids: string[] }`
- `POST /api/v1/users/me/team` — body: `{ persona_ids: string[] }`
- `DELETE /api/v1/users/me/team/{persona_id}` — 204
- Requires a `user_teams` join table or a JSONB column on a user preferences table
- Depends on Clerk auth being wired up to identify the user

---

### 11. User preferences API — LOW

- `GET/PATCH /api/v1/users/me/preferences` — browser mode, theme, etc.
- Replaces `localStorage` key `miror-browser-mode`

---

### 12. Browser favorites API — LOW

- `GET/POST/DELETE /api/v1/users/me/favorites` — bookmarked test URLs
- Replaces `localStorage` key `miror-browser-favorites`

---

### 13. Server-side test naming — LOW

- Add `name` field to `Study` model
- Auto-generate on creation (e.g. `{hostname}-{count}`)
- Replaces client-side counting logic in `running/page.tsx`

---

### 14. Wire raw fetch() calls into api-client.ts — LOW (Frontend task)

6+ endpoints called via raw `fetch()` instead of `api-client.ts`:
- `POST /studies/browser/warm`
- `GET /studies/{id}/flow-analysis`
- `GET /studies/{id}/accessibility`
- `GET /studies/{id}/accessibility/report`
- `POST /studies/{id}/issues/{issueId}/preview-fix`
- `GET /studies/{id}/emotional-journeys`
- `GET /studies/{id}/scroll-depth`

These need typed functions added to `frontend/src/lib/api-client.ts`.

---

## Partial Fix Applied (Needs Testing)

### test_planner.py keyword matching

The PR applied a partial fix to `backend/app/api/v1/test_planner.py`:
- Changed from substring matching to keyword overlap (`_keywords()` extracts meaningful words, scores by set intersection)
- Requires >= 2 keyword overlaps for a match
- Falls back to first 3 templates if nothing matches

**Status:** Merged, needs backend restart and testing. Will be superseded by the `POST /personas/recommend` endpoint (#3 above) which eliminates matching entirely.

---

## Suggested Implementation Order

| Phase | Tasks | Rationale |
|-------|-------|-----------|
| **Phase 1** | #1 (delete cascade), #8 (viewport) | Quick wins, unblock basic workflows |
| **Phase 2** | #2 (steps not saving), #4 (per-session live state) | Core test execution must work |
| **Phase 3** | #3 (persona recommend endpoint) | Replaces broken plan generation flow |
| **Phase 4** | #6 (cost estimate), #7 (per-persona model/cost) | Improve setup UX |
| **Phase 5** | #5 (showcase study) | Marketing/onboarding |
| **Phase 6** | #9-14 (normalize, team API, preferences, naming, fetch cleanup) | Polish |
