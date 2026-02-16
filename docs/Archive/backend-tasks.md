# Backend API — What We Have vs What We Need

> Complete inventory of every backend endpoint, what the frontend currently uses, what's **missing**, and where we're using **hardcoded demo data** as a workaround. Send this to your backend developer.

---

## Table of Contents

1. [Endpoints That Exist and Work](#endpoints-that-exist-and-work)
2. [Endpoints That Exist But Are NOT Wired Into api-client](#endpoints-that-exist-but-not-in-api-client)
3. [Endpoints That DON'T Exist Yet (Need to Build)](#endpoints-that-dont-exist-yet)
4. [Frontend Demo Data / Hardcoded Values to Replace](#frontend-demo-data--hardcoded-values)
5. [localStorage Keys That Should Move to Backend](#localstorage-keys-to-move-to-backend)
6. [API Response Fields That Are Missing or Incomplete](#api-response-fields-missing)
7. [Bugs](#bugs)

---

## Endpoints That Exist and Work

These are fully wired: backend endpoint exists → `lib/api-client.ts` has a function → a hook in `hooks/` wraps it → components consume it.

### Studies
| Method | Path | api-client fn | Hook | Status |
|--------|------|--------------|------|--------|
| `POST` | `/api/v1/studies` | `createStudy()` | `useCreateStudy()` | Working |
| `GET` | `/api/v1/studies?page&limit&status` | `listStudies()` | `useStudies()` | Working |
| `GET` | `/api/v1/studies/{id}` | `getStudy()` | `useStudy()` | Working |
| `DELETE` | `/api/v1/studies/{id}` | `deleteStudy()` | `useDeleteStudy()` | Working |
| `POST` | `/api/v1/studies/{id}/run` | `runStudy()` | `useRunStudy()` | Working |
| `GET` | `/api/v1/studies/{id}/status` | `getStudyStatus()` | `useStudyStatus()` | Working |
| `GET` | `/api/v1/studies/{id}/live-state` | `getLiveState()` | direct use in running page | Working |
| `POST` | `/api/v1/studies/plan` | `generateStudyPlan()` | direct use in QuickStart | Working |

### Sessions & Steps
| Method | Path | api-client fn | Hook | Status |
|--------|------|--------------|------|--------|
| `GET` | `/api/v1/studies/{id}/sessions` | `listSessions()` | `useSessions()` | Working |
| `GET` | `/api/v1/sessions/{id}` | `getSession()` | `useSessionDetail()` | Working |
| `GET` | `/api/v1/sessions/{id}/steps?page&limit` | `listSteps()` | `useSteps()` | Working |
| `GET` | `/api/v1/sessions/{id}/steps/{n}` | `getStep()` | `useStep()` | Working |

### Issues & Insights
| Method | Path | api-client fn | Hook | Status |
|--------|------|--------------|------|--------|
| `GET` | `/api/v1/studies/{id}/issues?severity&issue_type&persona_id&page_url` | `listIssues()` | `useIssues()` | Working |
| `GET` | `/api/v1/studies/{id}/insights` | `listInsights()` | `useInsights()` | Working |
| `GET` | `/api/v1/studies/{id}/heatmap?page_url` | `getHeatmap()` | `useHeatmap()` | Working |

### Personas
| Method | Path | api-client fn | Hook | Status |
|--------|------|--------------|------|--------|
| `GET` | `/api/v1/personas/templates?category` | `listPersonaTemplates()` | `usePersonaTemplates()` | Working |
| `GET` | `/api/v1/personas/templates/{id}` | `getPersonaTemplate()` | `usePersonaTemplate()` | Working |
| `POST` | `/api/v1/personas/generate` | `generatePersona()` | `useGeneratePersona()` | Working |
| `GET` | `/api/v1/personas/{id}` | `getPersona()` | `usePersona()` | Working |

### Reports
| Method | Path | api-client fn | Hook | Status |
|--------|------|--------------|------|--------|
| `GET` | `/api/v1/studies/{id}/report` | `getReportMetadata()` | `useReportMetadata()` | Working |
| `GET` | `/api/v1/studies/{id}/report/md` | `getReportMdUrl()` (URL builder) | direct fetch | Working |
| `GET` | `/api/v1/studies/{id}/report/pdf` | `getReportPdfUrl()` (URL builder) | direct download | Working |

### Screenshots
| Method | Path | api-client fn | Status |
|--------|------|--------------|--------|
| `GET` | `/api/v1/screenshots/{path}` | `getScreenshotUrl()` (URL builder) | Working |

### Comparison
| Method | Path | api-client fn | Hook | Status |
|--------|------|--------------|------|--------|
| `POST` | `/api/v1/studies/{id}/compare/{other_id}` | `compareStudies()` | `useCompareStudies()` | Working |

### Schedules
| Method | Path | api-client fn | Hook | Status |
|--------|------|--------------|------|--------|
| `POST` | `/api/v1/schedules` | `createSchedule()` | `useCreateSchedule()` | Working |
| `GET` | `/api/v1/schedules` | `listSchedules()` | `useSchedules()` | Working |
| `GET` | `/api/v1/schedules/{id}` | `getSchedule()` | `useSchedule()` | Working |
| `PATCH` | `/api/v1/schedules/{id}` | `updateSchedule()` | `useUpdateSchedule()` | Working |
| `DELETE` | `/api/v1/schedules/{id}` | `deleteSchedule()` | `useDeleteSchedule()` | Working |
| `POST` | `/api/v1/schedules/{id}/trigger` | `triggerSchedule()` | `useTriggerSchedule()` | Working |

### Score History
| Method | Path | api-client fn | Hook | Status |
|--------|------|--------------|------|--------|
| `GET` | `/api/v1/history/urls` | `listTrackedUrls()` | `useTrackedUrls()` | Working |
| `GET` | `/api/v1/history/scores?url&limit` | `getScoreHistory()` | `useScoreHistory()` | Working |

### Videos
| Method | Path | api-client fn | Hook | Status |
|--------|------|--------------|------|--------|
| `GET` | `/api/v1/sessions/{id}/video` | `getSessionVideo()` | `useSessionVideo()` | Working |
| `POST` | `/api/v1/sessions/{id}/video/generate` | `generateSessionVideo()` | `useGenerateVideo()` | Working |
| `GET` | `/api/v1/sessions/{id}/video/download` | `getVideoDownloadUrl()` (URL builder) | direct download | Working |
| `GET` | `/api/v1/studies/{id}/videos` | `listStudyVideos()` | `useStudyVideos()` | Working |

### Narration
| Method | Path | api-client fn | Hook | Status |
|--------|------|--------------|------|--------|
| `POST` | `/api/v1/sessions/{id}/narration/generate` | `generateNarration()` | `useGenerateNarration()` | Working |
| `GET` | `/api/v1/sessions/{id}/narration/status` | `getNarrationStatus()` | `useNarrationStatus()` | Working |
| `GET` | `/api/v1/sessions/{id}/narration/{step}` | `getNarrationAudioUrl()` (URL builder) | direct playback | Working |

### Fixes
| Method | Path | api-client fn | Hook | Status |
|--------|------|--------------|------|--------|
| `POST` | `/api/v1/studies/{id}/fixes/generate` | `generateFixes()` | direct use | Working |
| `GET` | `/api/v1/studies/{id}/fixes` | `listFixes()` | direct use | Working |

### Health
| Method | Path | api-client fn | Hook | Status |
|--------|------|--------------|------|--------|
| `GET` | `/api/v1/health` | `getHealth()` | `useHealth()` | Working |
| `GET` | `/api/v1/health/browser` | — | — | Exists, not used by FE |

### WebSocket
| Protocol | Path | Client | Status |
|----------|------|--------|--------|
| `WS` | `/api/v1/ws` | `lib/ws-client.ts` → `use-websocket.ts` | Working |
| `WS` | `/api/v1/ws/screencast` | `lib/screencast-client.ts` → `use-screencast.ts` | Working |

---

## Endpoints That Exist But NOT in api-client

These backend endpoints exist and the frontend calls them, but via raw `fetch()` instead of through `api-client.ts`. They work, but aren't typed or centralized.

| Method | Path | Called From | Should Add to api-client? |
|--------|------|------------|--------------------------|
| `POST` | `/api/v1/studies/browser/warm` | `study-setup-wizard.tsx:55` | Yes — fire-and-forget but should be typed |
| `GET` | `/api/v1/studies/{id}/flow-analysis` | `results/flow-issues-tab.tsx:38` | Yes |
| `GET` | `/api/v1/studies/{id}/accessibility` | `results/accessibility-tab.tsx:47` | Yes |
| `GET` | `/api/v1/studies/{id}/accessibility/report` | `results/accessibility-tab.tsx` | Yes |
| `POST` | `/api/v1/studies/{id}/issues/{issueId}/preview-fix` | `results/fix-preview.tsx:30` | Yes |
| `GET` | `/api/v1/studies/{id}/emotional-journeys` | component direct fetch | Yes |
| `GET` | `/api/v1/studies/{id}/scroll-depth?page_url` | component direct fetch | Yes |
| `GET` | `/api/v1/studies/{id}/estimate` | **Not called yet** — exists in backend but FE uses hardcoded values instead | Yes — see #1 below |
| `GET` | `/api/v1/proxy?url` | Not currently called | Maybe |
| `POST` | `/api/v1/webhooks/deploy/{secret}` | External only | No (webhook, not FE) |
| `POST` | `/api/v1/studies/{id}/export/github` | Not currently called | Future |

---

## Endpoints That DON'T Exist Yet

These are things the frontend needs but the backend doesn't provide yet.

### 1. Lightweight Cost Estimate (without saved study) — HIGH

**Why:** The "New test" page header shows estimated runtime and cost as the user adds personas/tasks. Currently hardcoded.

**Existing backend:** `GET /api/v1/studies/{id}/estimate` exists but requires a persisted study. `CostEstimator` in `backend/app/services/cost_estimator.py` has all the math.

**What's needed:**
```
GET /api/v1/studies/estimate?personas={n}&tasks={n}

Response: {
  estimated_cost_usd: number,
  estimated_duration_seconds: number,
  breakdown: {
    persona_generation: number,
    navigation_steps: number,
    screenshot_analysis: number,
    synthesis: number,
    report: number
  }
}
```

**Frontend workaround (DEMO):** `$0.40 * personas * tasks` for cost, `2 * personas * tasks` min for runtime.

**Files using demo data:**
- `components/study/study-setup-wizard.tsx` — header chips (~lines 215-232)

---

### 2. Per-Persona Model & Cost in Template Response — HIGH

**Why:** The persona table shows "Model" and "Cost" columns, currently hardcoded for every row.

**What's needed:** Add fields to `PersonaTemplateOut`:
```json
{
  "model": "claude-opus-4-6",
  "model_display_name": "Opus 4.6",
  "estimated_cost_per_run_usd": 0.40
}
```

**Frontend workaround (DEMO):** `const model = 'Opus 4.6'` and `const cost = 0.40` hardcoded.

**Files using demo data:**
- `components/persona/persona-table.tsx:210-211`
- `app/personas/options/page.tsx:13-64` (full mock array with varying costs/models)

---

### 3. Team Management API — MEDIUM

**Why:** "Your Team" (selected personas) is stored in `localStorage`. Doesn't sync across devices/browsers. Lost on clear.

**What's needed:**
```
GET    /api/v1/users/me/team                → { persona_ids: string[] }
POST   /api/v1/users/me/team                → body: { persona_ids: string[] }
DELETE /api/v1/users/me/team/{persona_id}   → 204
```

**Frontend workaround:** `localStorage` key `miror-my-team` (JSON array of IDs).

**Files using localStorage:**
- `app/page.tsx` — homepage team section (~lines 265-296)
- `components/persona/persona-table.tsx:104-123` — add/remove from team
- `app/personas/page.tsx:91-103` — reads on mount, listens for storage events

---

### 4. User Preferences API — LOW

**Why:** Browser mode preference (`local` vs `cloud`) stored in localStorage.

**What's needed:**
```
GET   /api/v1/users/me/preferences           → { browser_mode: "local" | "cloud", ... }
PATCH /api/v1/users/me/preferences           → body: { browser_mode: "local" | "cloud" }
```

**Frontend workaround:** `localStorage` key `miror-browser-mode`.

**Files using localStorage:**
- `components/study/study-setup-wizard.tsx:47-79`
- `components/study/quick-start.tsx:125`
- `app/study/[id]/running/page.tsx:87-88`

---

### 5. Browser Favorites API — LOW

**Why:** Bookmarked test URLs in localStorage.

**What's needed:**
```
GET    /api/v1/users/me/favorites     → { urls: string[] }
POST   /api/v1/users/me/favorites     → body: { url: string }
DELETE /api/v1/users/me/favorites     → body: { url: string }
```

**Frontend workaround:** `localStorage` key `miror-browser-favorites`.

**Files using localStorage:**
- `components/study/website-preview.tsx:26, 56-64`

---

### 6. Showcase Study (Case Study / Demo Test) — HIGH

**Why:** The homepage has a "Showcase study" button that should open a pre-built, fully completed study showcasing Mirror's capabilities — scores, issues, heatmaps, session replays, the full report. This is the primary onboarding tool for new users to understand what Mirror produces before running their own test.

**Important:** The case study is **not** part of the user's "My Tests" list. It is a special-case study that is hosted/served separately. The "Case Study" button on the homepage will link directly to it. It should never appear in `GET /api/v1/studies` (the user's study list) — it lives outside the normal study lifecycle entirely.

**What's needed:**
- A seeded study in the database with real data (screenshots, steps, issues, insights, heatmap data, sessions, report) for a well-known public website
- The study must be **excluded from normal study listing** — `GET /api/v1/studies` should filter it out (e.g. via an `is_showcase: true` flag or a separate table)
- The frontend needs a dedicated endpoint to fetch it

**Preferred approach:** `GET /api/v1/studies/showcase` that returns a fully completed study. If no showcase study exists, return 404. The frontend "Case Study" button will link to `/study/{showcase_id}` which renders the normal results view. The showcase study must be filtered out of `GET /api/v1/studies` so it doesn't appear in the user's test list.

**What needs to be seeded:**
- 1 completed study for a public site (e.g. a popular SaaS landing page)
- 3-5 persona sessions with real screenshots, steps, think-aloud data
- Issues across all severity levels (critical, major, minor, enhancement)
- Insights (universal, persona-specific, comparative, recommendations)
- Heatmap data for at least 2-3 pages
- A generated report (PDF + Markdown)

**Frontend usage:**
- `app/page.tsx` — "Case Study" button links to `/study/{showcase_id}`
- The showcase study ID is resolved via `GET /api/v1/studies/showcase`
- It does **not** appear in the user's "My Tests" page

**Files:**
- `app/page.tsx` — case study link on homepage

---

### 7. Server-Side Test Naming — LOW

**Why:** Test names like "google-1", "google-2" are computed client-side by fetching ALL studies and counting by hostname. Fragile and inefficient.

**What's needed:** Backend generates the name on study creation. Add `name` field to `Study` model and `StudyOut` response.

**Frontend workaround:** Client counts hostname occurrences in `app/study/[id]/running/page.tsx:129-145`.

---

## Frontend Demo Data / Hardcoded Values

Everything here is currently faked in the frontend and needs a real backend source.

| What | Hardcoded Value | Where | Replace With |
|------|----------------|-------|-------------|
| Per-persona cost | `$0.40` | `persona-table.tsx:211`, `study-setup-wizard.tsx:~217` | `PersonaTemplateOut.estimated_cost_per_run_usd` |
| Per-persona model | `'Opus 4.6'` | `persona-table.tsx:210` | `PersonaTemplateOut.model_display_name` |
| Runtime estimate | `personas * tasks * 2 min` | `study-setup-wizard.tsx:~216` | `GET /studies/estimate` endpoint |
| Cost estimate | `personas * tasks * $0.40` | `study-setup-wizard.tsx:~217` | `GET /studies/estimate` endpoint |
| Mock persona costs | `$0.09–$0.45` varying | `app/personas/options/page.tsx:13-64` | Real per-persona cost from API |
| Mock persona models | `'Opus 4.6'` / `'Sonnet 4.5'` | `app/personas/options/page.tsx:13-64` | Real model assignment from API |
| "Claude Opus 4.6" label | String literal | `components/study/persona-progress-card.tsx:257` | Model name from session/study data |
| "Opus" / "Opus Reasoning Trace" | String literals | `components/results/overview-tab.tsx:80,99` | Model name from insight/analysis data |
| Score color thresholds | `>=80` green, `>=60` amber, `>=40` orange, `<40` red | `lib/utils.ts:scoreColor()` (shared helper) | Could be configurable from backend (low priority) |
| Mood score mapping | `frustrated:1 ... delighted:5` | `app/study/[id]/running/page.tsx:447-453` | Could come from backend schema (low priority) |

---

## localStorage Keys to Move to Backend

| Key | Current Usage | Priority | Replacement |
|-----|-------------|----------|-------------|
| `miror-my-team` | Array of persona template IDs for "Your Team" | MEDIUM | `GET/POST/DELETE /api/v1/users/me/team` |
| `miror-browser-mode` | `"local"` or `"cloud"` browser preference | LOW | `GET/PATCH /api/v1/users/me/preferences` |
| `miror-browser-favorites` | Array of bookmarked URLs | LOW | `GET/POST/DELETE /api/v1/users/me/favorites` |

---

## API Response Fields Missing

These are fields the frontend needs but the current API response doesn't include.

### `PersonaTemplateOut` — needs these fields added:
```typescript
{
  // existing fields...
  model: string;                    // e.g. "claude-opus-4-6"
  model_display_name: string;       // e.g. "Opus 4.6"
  estimated_cost_per_run_usd: number; // e.g. 0.40
}
```

### `StudyOut` — needs this field added:
```typescript
{
  // existing fields...
  name: string;  // e.g. "google-1" — auto-generated on creation
}
```

### `PersonaTemplateOut.default_profile` — normalize these fields:
Currently returns mixed types (`tech_literacy` can be string "low" or number 3, `accessibility_needs` can be array or object). Should always return:
```typescript
{
  tech_literacy: number;              // always 1-10
  patience_level: number;             // always 1-10
  accessibility_needs: string[];      // always flat array
}
```

**Files doing client-side normalization:**
- `components/persona/persona-table.tsx:29-61` — `levelToNumber()`, `getAccessibilityNeeds()`
- `app/personas/page.tsx:36-64` — same functions duplicated

---

## Bugs

### 1. Delete test fails — CRITICAL

**What happens:** Clicking "Delete" on a test from the running page shows "Failed to delete test" toast. The delete confirmation dialog appears, user clicks the red "Delete" button, and the backend returns an error.

**Screenshot:**
![Delete test error](../docs/screenshots/delete-test-error.png)
<!-- Screenshot shows: Delete confirmation dialog over a running study page (google.com),
     with a "Failed to delete test" error toast in the bottom-right corner.
     The study has multiple personas (Tech-Savvy College Student, Privacy-Conscious User) all in "Waiting" status. -->

**Likely cause:** The `DELETE /api/v1/studies/{study_id}` endpoint calls `study_repo.delete()` which does a simple `session.delete(study)` + `session.flush()`. This probably fails due to **foreign key constraints** — the study has related `sessions`, `steps`, `issues`, `insights`, `personas`, and `tasks` that need to be deleted first (or the FK relationships need `CASCADE` delete configured).

**Relevant code path:**
- Frontend: `DELETE /api/v1/studies/{id}` → `lib/api-client.ts:82` → `hooks/use-study.ts:52` (`useDeleteStudy`)
- Backend: `backend/app/api/v1/studies.py:67` → `services/study_service.py:74` → `db/repositories/study_repo.py:86`
- Repository just does `session.delete(study)` with no cascade handling

**How to fix:**
- Option A: Add `cascade="all, delete-orphan"` to the SQLAlchemy relationships on the `Study` model so deleting a study cascades to all child records
- Option B: Manually delete child records in order (steps → issues → sessions → insights → personas → tasks → study) in `study_service.delete_study()`
- Also consider: deleting associated screenshot files from storage (`data/studies/{study_id}/`)

**Additional context:** This is user-facing and blocking — users can't clean up failed/unwanted tests.

---

### 2. Plan generation persona matching often fails — HIGH

**What happens:** When a user generates a test plan via QuickStart, the LLM generates persona recommendations with creative names (e.g. "Maria - Casual Browser", "Tyler - Student Researcher"). The backend tries to match these to existing persona templates by name, but the matching logic uses simple substring comparison which rarely works because template names are things like "Tech-Savvy College Student" or "Busy Working Parent".

**Result:** All personas come back with `template_id: null`, so clicking "Accept & Run" always fails with "No valid personas matched."

**Fix applied (partial):** Updated the matching in `backend/app/api/v1/test_planner.py` to use keyword overlap instead of substring matching, with a fallback to the first 3 templates if nothing matches. **This needs testing** — restart the backend to pick up the change.

**Relevant code:** `backend/app/api/v1/test_planner.py` — `_match_persona_to_template()` function

---

### 8. Replace Plan Generation With AI Persona Selection — HIGH

**Why:** The current flow generates a full "test plan" (tasks + personas) via LLM, which is slow and the persona matching is unreliable (see Bug #2). Instead, the user already provides the URL and task description — the only thing we need AI for is selecting the right personas.

**Current flow:**
1. User enters URL + task description
2. `POST /api/v1/studies/plan` → LLM generates tasks + persona recommendations
3. Persona names rarely match templates → "No valid personas matched" error

**Desired flow:**
1. User enters URL + task description
2. Backend uses AI to pick the 5 best-fitting persona templates from the database based on the URL and task
3. Returns the 5 selected personas (with their real `template_id`s) — no plan generation, no task rewriting

**What's needed:**
```
POST /api/v1/personas/recommend
Body: { url: string, task_description: string }

Response: {
  personas: [
    { template_id: string, name: string, emoji: string, reason: string },
    ... (5 total)
  ]
}
```

The endpoint should:
- Fetch all persona templates from the database
- Send the URL, task description, and persona list to the LLM
- Ask it to pick the 5 most relevant personas for this specific test
- Return real `template_id`s that map directly to existing templates (no matching needed)

**Frontend impact:** QuickStart will call this new endpoint instead of `generateStudyPlan()`. The review phase will show the 5 recommended personas (with option to add/remove). Tasks stay as-is from user input.

---

### 3. Backend logging and step data not surfacing properly — HIGH

**What happens:** Two related issues:

1. **No steps show in the feed during a test run.** The running page has a "Steps" tab in the FEED panel on the right side, but it stays empty ("Waiting for steps...") even after all personas have completed. Steps are either not being saved to the database, not being pushed via WebSocket, or not being returned by the steps API.

2. **Backend terminal logs are unclear.** It's hard to tell what's happening at each step when watching the backend output during a run.

**Screenshot:** The running page shows 6 personas all completed (Completed/Satisfied or Completed/Confident, one Failed), but the Steps feed is completely empty — just shows "Waiting for steps..."

**What's needed:**
- **Steps must actually be persisted** — verify that the navigation engine is saving step records to the database during execution
- **Steps must be pushed via WebSocket** — the `session:step` events need to fire so the frontend feed updates in real-time
- **`GET /api/v1/sessions/{id}/steps` must return data** — after a session completes, the steps endpoint should return all recorded steps with fully populated fields (think_aloud, action_type, action_selector, screenshot_path, emotional_state, confidence, task_progress, etc.)
- Improve backend logging during study execution so each step is clearly logged (persona name, step number, action taken, page URL, success/failure)
- Logs should be structured and easy to follow when watching a test run in the terminal

---

### 5. Selecting a different tester should show their browser view and steps — HIGH

**What happens:** When you click on a different tester (persona) in the left panel during a test run, the browser view and steps in the right-side FEED panel don't change. Every tester shows the same browser feed and the same (empty) steps. Each persona is navigating the site independently, so selecting a different one should show that persona's own browser view, screenshots, and step history.

**What's needed:**
- The backend must track and serve **per-session** live data: each session (one per persona) should have its own screencast stream, screenshot URL, and step history
- `GET /api/v1/studies/{id}/live-state` should return per-session data keyed by session ID (it may already do this — verify the data is actually different per session)
- WebSocket `session:step` events must include the `session_id` so the frontend can filter steps by the selected persona
- Screenshots and browser view URLs must be unique per session, not shared across all personas

---

### 4. Browser viewport is zoomed in / wrong resolution — MEDIUM

**What happens:** The live browser view in the FEED panel during a test run shows the page zoomed in way too much. For example, Google's sign-in page only shows the top-left portion (logo, "Sign in" heading, and the email input) — the rest is cut off. It looks like the Playwright browser viewport is set to a very small resolution or the page is being rendered at a high zoom level.

**What's needed:**
- Set the Playwright browser viewport to a standard desktop resolution (e.g. 1280x720 or 1440x900) so screenshots and the live view look normal
- Ensure the screencast/screenshot frames are captured at the full viewport size, not a cropped or zoomed portion
- If using Browserbase, check that the session is configured with appropriate viewport dimensions

---

## Summary

| # | Task | Priority | What Exists | What's Missing |
|---|------|----------|-------------|----------------|
| 1 | Lightweight cost/duration estimate | **HIGH** | `CostEstimator` service + `GET /studies/{id}/estimate` (requires saved study) | `GET /studies/estimate?personas=N&tasks=N` (no saved study needed) |
| 2 | Per-persona model & cost | **HIGH** | Nothing — not in `PersonaTemplateOut` | Add `model`, `model_display_name`, `estimated_cost_per_run_usd` to response |
| 3 | Team management API | **MEDIUM** | Nothing | `GET/POST/DELETE /api/v1/users/me/team` |
| 4 | User preferences API | **LOW** | Nothing | `GET/PATCH /api/v1/users/me/preferences` |
| 5 | Browser favorites API | **LOW** | Nothing | `GET/POST/DELETE /api/v1/users/me/favorites` |
| 6 | Showcase study (case study demo) | **HIGH** | Nothing | `GET /api/v1/studies/showcase` + seeded study with full data. **Hosted separately — must NOT appear in user's "My Tests" list** (`GET /studies` must filter it out) |
| 7 | Server-side test naming | **LOW** | Nothing | Add `name` to Study model, auto-generate on creation |
| 8 | Normalize persona profiles | **LOW** | Inconsistent types in `default_profile` | Always return numbers + flat arrays |
| 9 | Wire existing endpoints into api-client | **LOW** | 6+ endpoints called via raw `fetch()` | Add to `lib/api-client.ts` with types |
| 10 | **BUG: Delete test fails** | **CRITICAL** | `DELETE /studies/{id}` exists but errors out | FK cascade not configured — child records (sessions, steps, issues, etc.) block deletion |
| 11 | **BUG: Plan persona matching fails** | **HIGH** | Substring matching in `test_planner.py` | Partial fix applied (keyword overlap + fallback) — needs testing after backend restart |
| 12 | Replace plan generation with AI persona selection | **HIGH** | `POST /studies/plan` generates full plan (slow, unreliable matching) | `POST /personas/recommend` — AI picks 5 best personas from DB by URL + task. No plan generation, no task rewriting, real template_ids returned |
| 13 | **BUG: No steps saved / surfaced during test run** | **HIGH** | Steps feed is empty even after all personas complete; backend logs unclear | Steps not being persisted or pushed via WebSocket. `GET /sessions/{id}/steps` returns nothing. Fix step saving in navigation engine + WebSocket `session:step` events + improve logging |
| 14 | **BUG: Browser viewport zoomed in / wrong resolution** | **MEDIUM** | Playwright browser renders pages at wrong zoom/resolution | Set viewport to standard desktop size (1280x720+). Screenshots and live view show only top-left corner of the page |
| 15 | **BUG: Selecting different tester doesn't change browser/steps** | **HIGH** | Live state may not be per-session; steps not tied to session | Each session needs its own screencast, screenshots, and step history. WS `session:step` events must include `session_id`. Live-state must return unique data per session |
