# Mirror API Reference

## 1. Overview

Mirror exposes a RESTful JSON API and a WebSocket endpoint for real-time study progress. The API powers the full lifecycle of AI-driven usability testing: creating studies, launching browser-based persona sessions, retrieving UX issues and synthesized insights, and exporting professional PDF/Markdown reports.

### Base URL

```
https://miror.tech/api/v1
```

In local development the frontend (port 3000) proxies all `/api/v1/*` requests to the backend (port 8000), so clients always call the same path regardless of environment.

### Authentication

Authentication is not currently enforced on API endpoints. Clerk-based auth is planned for the next release. When enabled, all requests will require a valid Bearer token in the `Authorization` header:

```
Authorization: Bearer <clerk_session_token>
```

### Common conventions

- All resource IDs are UUIDs.
- Timestamps use ISO-8601 format (`2026-02-16T14:30:00Z`).
- Paginated endpoints accept `page` (1-based) and `limit` query parameters.
- Successful creation returns `201 Created`. Deletion returns `204 No Content`.
- Errors follow a standard shape: `{ "detail": "Human-readable message" }`.

---

## 2. Studies

Studies are the top-level resource. A study targets a URL, defines one or more tasks for personas to complete, and selects which AI personas will navigate the site.

### Endpoint summary

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/studies` | Create a new study |
| `GET` | `/studies` | List studies with pagination |
| `GET` | `/studies/estimate` | Quick cost/duration estimate without a saved study |
| `GET` | `/studies/{id}` | Get study with full results |
| `DELETE` | `/studies/{id}` | Delete study and all associated data |
| `POST` | `/studies/{id}/run` | Start executing the study |
| `GET` | `/studies/{id}/status` | Poll study progress |
| `GET` | `/studies/{id}/live-state` | Get durable live session state snapshot |
| `GET` | `/studies/{id}/estimate` | Estimate the cost of running a specific study |
| `POST` | `/studies/browser/warm` | Pre-warm a Browserbase session |

### POST /studies

Create a new study with tasks and selected persona templates.

**Request body**

```json
{
  "url": "https://example.com",
  "starting_path": "/",
  "tasks": [
    {
      "description": "Find the pricing page and compare the Pro and Enterprise plans",
      "order_index": 0
    },
    {
      "description": "Sign up for a free trial using an email address",
      "order_index": 1
    }
  ],
  "persona_template_ids": [
    "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "b2c3d4e5-f6a7-8901-bcde-f12345678901"
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | Target website URL (max 2048 chars) |
| `starting_path` | string | No | Path to start navigation from (default `/`) |
| `tasks` | array | Yes | 1-10 task objects for personas to attempt |
| `tasks[].description` | string | Yes | Natural language task description (max 2000 chars) |
| `tasks[].order_index` | integer | No | Task ordering (default 0) |
| `persona_template_ids` | array[UUID] | Yes | 1-10 persona template IDs to include |

**Response** `201 Created`

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "url": "https://example.com",
  "starting_path": "/",
  "status": "setup",
  "overall_score": null,
  "executive_summary": null,
  "created_at": "2026-02-16T14:30:00Z",
  "updated_at": "2026-02-16T14:30:00Z",
  "started_at": null,
  "duration_seconds": null,
  "tasks": [
    {
      "id": "c1d2e3f4-a5b6-7890-cdef-123456789012",
      "study_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "description": "Find the pricing page and compare the Pro and Enterprise plans",
      "order_index": 0,
      "created_at": "2026-02-16T14:30:00Z"
    }
  ],
  "personas": [
    {
      "id": "d2e3f4a5-b6c7-8901-defa-234567890123",
      "study_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "template_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "profile": { "name": "Sarah Chen", "age": 34, "tech_literacy": 8 },
      "is_custom": false,
      "created_at": "2026-02-16T14:30:00Z"
    }
  ],
  "llm_input_tokens": null,
  "llm_output_tokens": null,
  "llm_total_tokens": null,
  "llm_api_calls": null,
  "llm_cost_usd": null,
  "browser_mode": null,
  "browser_cost_usd": null,
  "total_cost_usd": null
}
```

### GET /studies

List studies with pagination and optional status filter.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number (1-based) |
| `limit` | integer | 20 | Items per page (max 100) |
| `status` | string | null | Filter by status: `setup`, `running`, `analyzing`, `complete`, `failed` |

**Response** `200 OK`

```json
{
  "items": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "url": "https://example.com",
      "status": "complete",
      "overall_score": 72.5,
      "created_at": "2026-02-16T14:30:00Z",
      "task_count": 2,
      "persona_count": 3,
      "first_task": "Find the pricing page and compare plans"
    }
  ],
  "total": 12,
  "page": 1,
  "limit": 20
}
```

### GET /studies/estimate

Lightweight cost and duration estimate without requiring a saved study.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `personas` | integer | 1 | Number of personas (1-10) |
| `tasks` | integer | 1 | Number of tasks (1-10) |

**Response** `200 OK`

Returns an estimate object with projected cost and duration values.

### GET /studies/{id}

Returns the full study object with tasks, personas, and cost-tracking fields. Same shape as the POST response, with fields populated after study completion (e.g., `overall_score`, `executive_summary`, `duration_seconds`, token/cost fields).

### DELETE /studies/{id}

Deletes the study and all associated sessions, steps, issues, insights, and screenshots.

**Response** `204 No Content`

### POST /studies/{id}/run

Dispatches the study to the background worker queue. Each persona launches a real browser session and navigates the target site.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `browser_mode` | string (query) | null | `local` or `cloud` -- forces browser mode |

**Response** `200 OK`

```json
{
  "study_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "job_id": "arq:job:abc123",
  "status": "running"
}
```

### GET /studies/{id}/status

Poll the current progress of a running study.

**Response** `200 OK`

```json
{
  "study_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "status": "running",
  "percent": 45.0,
  "phase": "navigating"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `setup`, `running`, `analyzing`, `complete`, or `failed` |
| `percent` | float | Progress percentage (0-100) |
| `phase` | string | Current phase: `navigating`, `analyzing`, `synthesis`, `report` |

### GET /studies/{id}/live-state

Get a durable snapshot of all active persona sessions for real-time progress polling. This is a reliable alternative to the WebSocket for the running page.

**Response** `200 OK`

Returns a dictionary keyed by session ID. Each entry includes the current step number, think-aloud text, screenshot URL, live view URL, and browser status.

### GET /studies/{id}/estimate

Estimate the cost of running a specific (already-created) study before execution.

**Response** `200 OK`

Returns projected cost breakdown based on the number of personas and tasks in the study.

### POST /studies/browser/warm

Pre-warm a Browserbase session while the user configures their study. Call this from the frontend when the user lands on the study setup page to save 7-15 seconds of cold-start latency.

**Response** `200 OK`

```json
{
  "status": "warming",
  "session_id": "bb-session-id"
}
```

Possible `status` values: `warming` (new session created), `ready` (warm session already cached), `skipped` (Browserbase not configured), `error`.

---

## 3. Study planning

Natural language study planning turns a free-form description into a structured study configuration with tasks and matched personas.

### Endpoint summary

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/studies/plan` | Generate a study plan from a natural language description |

### POST /studies/plan

Generate a study plan from a natural language description. The LLM produces tasks and persona recommendations, then persona names are matched to existing templates in the database.

**Request body**

```json
{
  "description": "Test the checkout flow for mobile users who are not tech-savvy",
  "url": "https://example.com"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | string | Yes | Natural language description of what to test (min 1 char) |
| `url` | string | Yes | Target website URL (min 1 char) |

**Response** `200 OK`

```json
{
  "url": "https://example.com",
  "tasks": [
    {
      "description": "Add an item to the cart and proceed to checkout",
      "order_index": 0
    },
    {
      "description": "Complete the payment form using a credit card",
      "order_index": 1
    }
  ],
  "personas": [
    {
      "template_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Margaret Wilson",
      "emoji": "👵",
      "reason": "Retired teacher with low tech literacy who represents mobile-first senior users"
    }
  ],
  "summary": "This plan tests the end-to-end checkout flow focusing on mobile usability for non-technical users."
}
```

---

## 4. Sessions and steps

A session represents one persona attempting one task. Each session contains a sequence of steps -- screenshot, think-aloud narration, browser action, and UX observations.

### Endpoint summary

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/studies/{id}/sessions` | List all sessions for a study |
| `GET` | `/sessions/{id}` | Get session detail with steps and issues |
| `GET` | `/sessions/{id}/steps` | Get paginated steps for a session |
| `GET` | `/sessions/{id}/steps/{n}` | Get a single step by step number |

### GET /studies/{id}/sessions

Returns all sessions for a study.

**Response** `200 OK`

```json
[
  {
    "id": "e3f4a5b6-c7d8-9012-efab-345678901234",
    "study_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "persona_id": "d2e3f4a5-b6c7-8901-defa-234567890123",
    "task_id": "c1d2e3f4-a5b6-7890-cdef-123456789012",
    "status": "complete",
    "total_steps": 18,
    "task_completed": true,
    "summary": "Successfully found the pricing page after exploring the navigation menu. Compared both plans and identified key differences.",
    "emotional_arc": {
      "start": "curious",
      "middle": "confused",
      "end": "satisfied"
    },
    "live_view_url": null,
    "browser_active": false,
    "created_at": "2026-02-16T14:31:00Z"
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `pending`, `running`, `complete`, `failed`, or `gave_up` |
| `task_completed` | boolean | Whether the persona accomplished the task |
| `emotional_arc` | object | Emotional journey of the persona (start, middle, end) |
| `live_view_url` | string | Browserbase live view URL while session is active |

### GET /sessions/{id}

Returns full session detail including all steps and issues found during that session.

**Response** `200 OK`

```json
{
  "id": "e3f4a5b6-c7d8-9012-efab-345678901234",
  "study_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "persona_id": "d2e3f4a5-b6c7-8901-defa-234567890123",
  "task_id": "c1d2e3f4-a5b6-7890-cdef-123456789012",
  "status": "complete",
  "total_steps": 18,
  "task_completed": true,
  "summary": "Successfully found the pricing page.",
  "emotional_arc": { "start": "curious", "middle": "confused", "end": "satisfied" },
  "live_view_url": null,
  "browser_active": false,
  "created_at": "2026-02-16T14:31:00Z",
  "steps": [ "..." ],
  "issues": [ "..." ]
}
```

### GET /sessions/{id}/steps

Get paginated steps for a session.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 50 | Items per page (max 100) |

### GET /sessions/{id}/steps/{n}

Get a single step by its step number. This is the core data unit for session replay.

**Response** `200 OK`

```json
{
  "id": "f4a5b6c7-d8e9-0123-fabc-456789012345",
  "session_id": "e3f4a5b6-c7d8-9012-efab-345678901234",
  "step_number": 8,
  "page_url": "https://example.com/pricing",
  "page_title": "Pricing - Example",
  "screenshot_path": "f47ac10b/e3f4a5b6/steps/step_008.png",
  "think_aloud": "I can see the pricing page now. Let me look at the Pro and Enterprise columns side by side. The font size on the feature comparison is quite small, which makes it hard to read.",
  "action_type": "scroll",
  "action_selector": null,
  "action_value": "down 300px",
  "confidence": 0.85,
  "task_progress": 65.0,
  "emotional_state": "focused",
  "click_x": null,
  "click_y": null,
  "viewport_width": 1920,
  "viewport_height": 1080,
  "scroll_y": 450,
  "max_scroll_y": 2400,
  "load_time_ms": 1230,
  "first_paint_ms": 340,
  "created_at": "2026-02-16T14:32:15Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `step_number` | integer | Sequential step index within the session |
| `screenshot_path` | string | Relative path to the screenshot image (serve via `/screenshots/` endpoint) |
| `think_aloud` | string | AI persona's narrated thought process |
| `action_type` | string | Browser action: `click`, `type`, `scroll`, `navigate`, `wait`, etc. |
| `action_selector` | string | CSS selector of the target element |
| `confidence` | float | Persona's confidence in the action (0.0-1.0) |
| `task_progress` | float | Estimated progress toward task completion (0-100) |
| `emotional_state` | string | Current emotion: `curious`, `confused`, `frustrated`, `focused`, `satisfied`, etc. |
| `click_x`, `click_y` | integer | Click coordinates (null for non-click actions) |
| `scroll_y` | integer | Current vertical scroll position in pixels |
| `max_scroll_y` | integer | Maximum scrollable height of the page |
| `load_time_ms` | integer | Page load time in milliseconds |
| `first_paint_ms` | integer | First paint time in milliseconds |

---

## 5. Analysis

After all persona sessions complete, Mirror runs a multi-stage analysis pipeline: per-step UX auditing, cross-persona issue deduplication, insight synthesis, and heatmap generation.

### Endpoint summary

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/studies/{id}/issues` | List UX issues found across all sessions |
| `GET` | `/studies/{id}/insights` | Get synthesized cross-persona insights |
| `GET` | `/studies/{id}/heatmap` | Get click heatmap data |

### GET /studies/{id}/issues

Returns all UX issues discovered during the study, optionally filtered.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `severity` | string | null | Filter: `critical`, `major`, `minor`, `enhancement` |
| `issue_type` | string | null | Filter: `ux`, `accessibility`, `performance` |
| `persona_id` | UUID | null | Filter by persona |
| `page_url` | string | null | Filter by page URL |

**Response** `200 OK`

```json
[
  {
    "id": "a5b6c7d8-e9f0-1234-abcd-567890123456",
    "step_id": "f4a5b6c7-d8e9-0123-fabc-456789012345",
    "session_id": "e3f4a5b6-c7d8-9012-efab-345678901234",
    "study_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "element": "nav.main-menu > ul > li:nth-child(3)",
    "description": "The 'Pricing' link in the navigation menu has low contrast against the dark background, making it difficult to identify as an interactive element.",
    "severity": "major",
    "heuristic": "Visibility of system status",
    "wcag_criterion": "1.4.3 Contrast (Minimum)",
    "recommendation": "Increase the contrast ratio of navigation links to at least 4.5:1 against the background color.",
    "page_url": "https://example.com/",
    "issue_type": "ux",
    "first_seen_study_id": null,
    "times_seen": 3,
    "is_regression": false,
    "priority_score": 8.5,
    "step_number": 4,
    "fix_suggestion": "Change the nav link color from #666 to #333 or lighter background.",
    "fix_code": "nav a { color: #1a1a1a; }",
    "fix_language": "css",
    "created_at": "2026-02-16T14:33:00Z"
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `severity` | string | `critical`, `major`, `minor`, or `enhancement` |
| `heuristic` | string | Nielsen's usability heuristic this issue violates |
| `wcag_criterion` | string | WCAG 2.1 criterion if applicable |
| `recommendation` | string | Actionable fix recommendation |
| `issue_type` | string | Category: `ux`, `accessibility`, or `performance` |
| `times_seen` | integer | Number of times this issue was observed across sessions |
| `is_regression` | boolean | Whether this issue was not present in a previous study of the same URL |
| `priority_score` | float | Computed priority based on severity and frequency |
| `fix_suggestion` | string | Human-readable fix suggestion |
| `fix_code` | string | Suggested code fix (when applicable) |
| `fix_language` | string | Language of the fix code (`css`, `javascript`, etc.) |

### GET /studies/{id}/insights

Returns AI-synthesized insights comparing behavior across all personas and tasks.

**Response** `200 OK`

```json
[
  {
    "id": "b6c7d8e9-f0a1-2345-bcde-678901234567",
    "study_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "type": "universal",
    "title": "Navigation menu is not discoverable on mobile viewports",
    "description": "All 3 personas struggled to find the hamburger menu icon. Average time to first interaction with navigation was 12 seconds, compared to 2 seconds on desktop layouts.",
    "severity": "critical",
    "impact": "high",
    "effort": "low",
    "personas_affected": ["Sarah Chen", "Marcus Johnson", "Priya Sharma"],
    "evidence": [
      { "session_id": "...", "step_number": 3, "quote": "Where is the menu?" }
    ],
    "rank": 1,
    "reasoning_trace": "Observed across all 3 personas. Navigation is the gateway to all tasks.",
    "created_at": "2026-02-16T14:40:00Z"
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | `universal` (all personas), `persona_specific`, `comparative`, or `recommendation` |
| `impact` | string | `high`, `medium`, or `low` |
| `effort` | string | `high`, `medium`, or `low` -- estimated effort to fix |
| `personas_affected` | array | List of persona names that experienced this issue |
| `evidence` | array | Supporting evidence from session steps |
| `rank` | integer | Priority ranking (1 = most important) |
| `reasoning_trace` | string | LLM reasoning behind this insight |

### GET /studies/{id}/heatmap

Returns raw click coordinate data for heatmap rendering.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page_url` | string | null | Filter to a specific page (returns first page if omitted) |

**Response** `200 OK`

```json
{
  "page_url": "https://example.com/pricing",
  "data_points": [
    {
      "page_url": "https://example.com/pricing",
      "click_x": 450,
      "click_y": 320,
      "viewport_width": 1920,
      "viewport_height": 1080,
      "persona_name": "Sarah Chen"
    }
  ],
  "total_clicks": 47,
  "page_screenshots": {
    "https://example.com/pricing": "/api/v1/screenshots/f47ac10b/step_008.png"
  }
}
```

---

## 6. Study comparison

Compare two study runs (e.g., before/after a redesign) to see score changes, fixed issues, and new regressions.

### Endpoint summary

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/studies/{id}/compare/{other_id}` | Compare two studies and return delta analysis |

### POST /studies/{id}/compare/{other_id}

`{id}` is the baseline ("before") study and `{other_id}` is the comparison ("after") study.

**Response** `200 OK`

```json
{
  "baseline_study_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "comparison_study_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "baseline_score": 62.0,
  "comparison_score": 78.5,
  "score_delta": 16.5,
  "score_improved": true,
  "issues_fixed": [
    {
      "element": "nav.main-menu",
      "description": "Low contrast navigation links",
      "severity": "major",
      "page_url": "https://example.com/",
      "status": "fixed"
    }
  ],
  "issues_new": [],
  "issues_persisting": [],
  "total_baseline_issues": 14,
  "total_comparison_issues": 8,
  "summary": "Score improved by 16.5 points. 6 issues were fixed and no new issues were introduced."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `score_delta` | float | Comparison score minus baseline score |
| `score_improved` | boolean | Whether the comparison scored higher |
| `issues_fixed` | array | Issues present in baseline but absent in comparison |
| `issues_new` | array | Issues absent in baseline but present in comparison |
| `issues_persisting` | array | Issues present in both studies |

Each issue diff includes a `status` field: `fixed`, `new`, `persisting`, `improved`, or `regressed`.

---

## 7. Fix suggestions

AI-powered code fix generation and live preview for UX issues discovered during studies.

### Endpoint summary

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/studies/{id}/fixes/generate` | Generate fix suggestions for study issues |
| `GET` | `/studies/{id}/fixes` | List all issues with fix suggestions |
| `POST` | `/studies/{id}/issues/{issue_id}/preview-fix` | Preview a fix with before/after screenshots |

### POST /studies/{id}/fixes/generate

Generate AI-powered code fix suggestions for issues in a study.

**Request body** (optional)

```json
{
  "issue_ids": [
    "a5b6c7d8-e9f0-1234-abcd-567890123456"
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `issue_ids` | array[UUID] | No | Specific issue IDs to generate fixes for. Generates for all issues if omitted. |

**Response** `200 OK`

```json
{
  "study_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "fixes_generated": 3,
  "fixes": [
    {
      "issue_id": "a5b6c7d8-e9f0-1234-abcd-567890123456",
      "element": "nav.main-menu > a",
      "description": "Low contrast navigation links",
      "severity": "major",
      "fix_suggestion": "Increase link color contrast to meet WCAG AA",
      "fix_code": "nav a { color: #1a1a1a; }",
      "fix_language": "css",
      "page_url": "https://example.com/"
    }
  ]
}
```

### GET /studies/{id}/fixes

List all issues that have generated fix suggestions for a study.

**Response** `200 OK`

Returns an array of `FixSuggestionOut` objects (same shape as the items in the `fixes` array above).

### POST /studies/{id}/issues/{issue_id}/preview-fix

Preview a fix by injecting it into a live browser and returning before/after screenshots with a visual diff.

The issue must already have a generated fix (`fix_code` and `fix_language` populated). Call `/fixes/generate` first if needed.

**Response** `200 OK`

```json
{
  "success": true,
  "before_url": "/api/v1/screenshots/previews/before.png",
  "after_url": "/api/v1/screenshots/previews/after.png",
  "diff_url": "/api/v1/screenshots/previews/diff.png",
  "before_base64": "data:image/png;base64,...",
  "after_base64": "data:image/png;base64,...",
  "diff_base64": "data:image/png;base64,...",
  "error": null
}
```

---

## 8. Emotional journeys

Visualize each persona's emotional arc through a study, step by step.

### Endpoint summary

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/studies/{id}/emotional-journeys` | Get emotional journey for each persona |

### GET /studies/{id}/emotional-journeys

Returns the step-by-step emotional arc, outcome, and peak frustration point for each persona in a study.

**Response** `200 OK`

```json
{
  "study_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "personas": [
    {
      "name": "Sarah Chen",
      "emoji": "👩‍💻",
      "journey": [
        {
          "step": 1,
          "emotion": "curious",
          "page": "https://example.com/",
          "think_aloud": "Let me explore this site..."
        },
        {
          "step": 2,
          "emotion": "confused",
          "page": "https://example.com/pricing",
          "think_aloud": "Where is the comparison table?"
        }
      ],
      "outcome": "complete",
      "peak_frustration_step": 5,
      "peak_frustration_page": "https://example.com/checkout"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `journey` | array | Step-by-step emotions with page URL and think-aloud text |
| `outcome` | string | Session status: `complete`, `failed`, `gave_up`, etc. |
| `peak_frustration_step` | integer | Step number where the longest frustration/confusion streak peaked |
| `peak_frustration_page` | string | Page URL at peak frustration |

---

## 9. Scroll depth

Aggregate scroll behavior data per persona for a specific page in a study.

### Endpoint summary

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/studies/{id}/scroll-depth` | Get scroll depth data per persona for a page |

### GET /studies/{id}/scroll-depth

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page_url` | string | Yes | URL of the page to analyze |

**Response** `200 OK`

```json
{
  "page_url": "https://example.com/pricing",
  "page_height": 3200,
  "personas": [
    {
      "name": "Sarah Chen",
      "max_depth_px": 2800,
      "max_depth_pct": 87.5
    },
    {
      "name": "Marcus Johnson",
      "max_depth_px": 1200,
      "max_depth_pct": 37.5
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `page_height` | integer | Total page height in pixels |
| `personas[].max_depth_px` | integer | Maximum scroll depth reached in pixels |
| `personas[].max_depth_pct` | float | Maximum scroll depth as a percentage of page height |

---

## 10. Reports

Mirror generates professional UX audit reports in Markdown and PDF formats. Reports include executive summaries, issue breakdowns, persona comparisons, and prioritized recommendations.

### Endpoint summary

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/studies/{id}/report` | Get report metadata and available formats |
| `GET` | `/studies/{id}/report/md` | Download Markdown report |
| `GET` | `/studies/{id}/report/pdf` | Download PDF report |

### GET /studies/{id}/report

**Response** `200 OK`

```json
{
  "study_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "format": "markdown",
  "available_formats": ["markdown", "pdf"],
  "generated": true
}
```

### GET /studies/{id}/report/md

Downloads the Markdown report as a file attachment.

**Response** `200 OK`
- Content-Type: `text/markdown`
- Content-Disposition: `attachment; filename=mirror-report-{study_id}.md`

### GET /studies/{id}/report/pdf

Downloads the PDF report as a file attachment.

**Response** `200 OK`
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename=mirror-report-{study_id}.pdf`

---

## 11. Accessibility audit

Deep WCAG compliance analysis using Opus vision to detect accessibility issues that automated tools miss.

### Endpoint summary

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/studies/{id}/accessibility` | Run accessibility audit on all unique pages |
| `GET` | `/studies/{id}/accessibility/report` | Get aggregated WCAG compliance report |

### GET /studies/{id}/accessibility

Analyzes screenshots from completed sessions to detect WCAG violations such as color contrast issues, missing alt text, and focus indicator problems.

**Response** `200 OK`

```json
{
  "study_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "pages_audited": 4,
  "audits": [
    {
      "page_url": "https://example.com/",
      "wcag_level": "AA",
      "pass_count": 18,
      "fail_count": 3,
      "compliance_percentage": 85.7,
      "criteria_count": 21,
      "visual_issue_count": 2,
      "summary": "3 WCAG AA criteria failed, primarily related to color contrast and link identification."
    }
  ]
}
```

### GET /studies/{id}/accessibility/report

Runs accessibility audits on all unique pages and generates a site-wide compliance summary.

**Response** `200 OK`

```json
{
  "study_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "overall_compliance_percentage": 82.3,
  "total_pages": 4,
  "total_pass": 68,
  "total_fail": 12,
  "wcag_level": "AA",
  "pages": [],
  "failing_criteria": [],
  "visual_issues": [],
  "summary": "Site-wide WCAG AA compliance is at 82.3%. Key areas for improvement include color contrast and focus indicators."
}
```

---

## 12. Videos

Generate animated GIF replay videos from session screenshots, optionally including narration overlays.

### Endpoint summary

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/sessions/{id}/video` | Get video metadata for a session |
| `POST` | `/sessions/{id}/video/generate` | Generate a video replay for a session |
| `GET` | `/sessions/{id}/video/download` | Download the generated video file |
| `GET` | `/studies/{id}/videos` | List all generated videos for a study |

### GET /sessions/{id}/video

Returns video metadata for a session, or `null` if no video has been generated.

**Response** `200 OK`

```json
{
  "id": "c7d8e9f0-a1b2-3456-cdef-789012345678",
  "session_id": "e3f4a5b6-c7d8-9012-efab-345678901234",
  "video_path": "f47ac10b/e3f4a5b6/video/replay.gif",
  "duration_seconds": 36.0,
  "frame_count": 18,
  "has_narration": true,
  "status": "complete",
  "error_message": null,
  "created_at": "2026-02-16T15:00:00Z",
  "updated_at": "2026-02-16T15:00:30Z"
}
```

### POST /sessions/{id}/video/generate

Generate a video replay for a session. Returns immediately with the video ID and status.

**Request body** (optional)

```json
{
  "include_narration": true,
  "frame_duration_ms": 2000
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `include_narration` | boolean | true | Include think-aloud narration overlays |
| `frame_duration_ms` | integer | 2000 | Duration of each screenshot frame in milliseconds |

**Response** `200 OK`

```json
{
  "video_id": "c7d8e9f0-a1b2-3456-cdef-789012345678",
  "session_id": "e3f4a5b6-c7d8-9012-efab-345678901234",
  "status": "pending",
  "message": "Video generation started"
}
```

### GET /sessions/{id}/video/download

Download the generated video file as an animated GIF.

**Response** `200 OK`
- Content-Type: `image/gif`
- Content-Disposition: `attachment; filename=session-{session_id}-replay.gif`

Returns `404` if no video has been generated for the session.

### GET /studies/{id}/videos

List all generated videos across all sessions in a study.

**Response** `200 OK`

Returns an array of `VideoOut` objects (same shape as the single video metadata endpoint).

---

## 13. Voice narration

Generate TTS audio narration for session replay using ElevenLabs.

### Endpoint summary

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/sessions/{id}/narration/generate` | Trigger voice narration generation |
| `GET` | `/sessions/{id}/narration/status` | Check narration generation progress |
| `GET` | `/sessions/{id}/narration/{step_number}` | Get audio for a specific step |

### POST /sessions/{id}/narration/generate

Trigger voice narration generation for all steps in a session. Generation runs in the background. Poll the status endpoint to track progress.

**Response** `200 OK`

```json
{
  "session_id": "e3f4a5b6-c7d8-9012-efab-345678901234",
  "status": "generating",
  "message": "Narration generation started"
}
```

Returns `503` if the ElevenLabs API key is not configured.

### GET /sessions/{id}/narration/status

Check the current status of narration generation for a session.

**Response** `200 OK`

```json
{
  "session_id": "e3f4a5b6-c7d8-9012-efab-345678901234",
  "status": "complete",
  "total_steps": 18,
  "generated_steps": 18,
  "failed_steps": 0,
  "voice_id": "default",
  "error": null
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `not_started`, `generating`, `complete`, or `failed` |
| `total_steps` | integer | Total steps in the session |
| `generated_steps` | integer | Number of steps with generated audio |
| `failed_steps` | integer | Number of steps where TTS failed |

### GET /sessions/{id}/narration/{step_number}

Get the narration audio for a specific step. Returns an MP3 audio file.

**Response** `200 OK`
- Content-Type: `audio/mpeg`
- Content-Disposition: `inline; filename=narration-step-008.mp3`
- Cache-Control: `public, max-age=86400`

Returns `404` if no narration audio exists for this step.

---

## 14. Personas

Mirror includes 20+ pre-built AI persona templates spanning demographics, tech literacy levels, accessibility needs, and behavioral profiles. Custom personas can be generated from natural language descriptions.

### Endpoint summary

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/personas/templates` | List all persona templates |
| `GET` | `/personas/templates/{id}` | Get a specific template |
| `POST` | `/personas/generate` | Generate and save a custom persona |
| `POST` | `/personas/generate/draft` | Generate a draft persona without saving |
| `POST` | `/personas/recommend` | Get AI-recommended personas for a URL + task |
| `GET` | `/personas/{id}` | Get a study-specific persona instance |

### GET /personas/templates

Returns all available persona templates. Templates are auto-seeded from the built-in library on first access.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `category` | string | null | Filter by category (e.g., `tech-savvy`, `accessibility`, `senior`) |

**Response** `200 OK`

```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Sarah Chen",
    "emoji": "👩‍💻",
    "category": "tech-savvy",
    "short_description": "Senior software engineer, 34. Power user who expects fast, keyboard-navigable interfaces.",
    "default_profile": {
      "name": "Sarah Chen",
      "age": 34,
      "occupation": "Senior Software Engineer",
      "tech_literacy": 9,
      "patience_level": 3,
      "reading_speed": 8,
      "trust_level": 4,
      "exploration_tendency": 7,
      "device_preference": "desktop"
    },
    "avatar_url": "https://i.pravatar.cc/200?u=Sarah+Chen",
    "model_display_name": "Opus 4.6",
    "estimated_cost_per_run_usd": 0.40,
    "created_at": "2026-01-15T10:00:00Z"
  }
]
```

### GET /personas/templates/{id}

Get a single persona template by its UUID.

**Response** `200 OK` -- same shape as items in the template list.

### POST /personas/generate

Generate a fully-formed persona from a natural language description using Claude Opus. The generated persona is saved as a custom template and can be selected in future studies.

**Request body**

```json
{
  "description": "A 65-year-old retired teacher who just got her first smartphone. She is patient but easily overwhelmed by too many options on screen. She prefers large text and clear labels.",
  "options": {
    "tech_literacy": 2,
    "patience_level": 8,
    "device_preference": "mobile",
    "accessibility_needs": {
      "low_vision": true,
      "cognitive": true
    }
  },
  "avatar_url": null
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | string | Yes | Natural language persona description (10-2000 chars) |
| `options.tech_literacy` | integer | No | 1-10 scale |
| `options.patience_level` | integer | No | 1-10 scale |
| `options.reading_speed` | integer | No | 1-10 scale |
| `options.trust_level` | integer | No | 1-10 scale |
| `options.exploration_tendency` | integer | No | 1-10 scale |
| `options.device_preference` | string | No | `desktop`, `mobile`, or `tablet` |
| `options.accessibility_needs` | object | No | Flags for `screen_reader`, `low_vision`, `color_blind`, `motor_impairment`, `cognitive` |
| `avatar_url` | string | No | Custom avatar image URL or base64 data (max 2MB) |

**Response** `200 OK` -- Returns a full `PersonaTemplateOut` object (same shape as template list items).

### POST /personas/generate/draft

Generate a draft persona configuration from a description without saving to the database. Useful for previewing the generated persona before committing.

**Request body** -- same as `POST /personas/generate`.

**Response** `200 OK`

```json
{
  "name": "Margaret Wilson",
  "short_description": "Retired teacher, 65. Patient but easily overwhelmed by cluttered interfaces.",
  "emoji": "👵",
  "tech_literacy": 2,
  "patience_level": 8,
  "reading_speed": 4,
  "trust_level": 6,
  "exploration_tendency": 3,
  "device_preference": "mobile",
  "accessibility_needs": {
    "screen_reader": null,
    "low_vision": true,
    "color_blind": null,
    "motor_impairment": null,
    "cognitive": true,
    "description": null
  }
}
```

### POST /personas/recommend

Uses Claude Sonnet to recommend the 5 best personas from the template library for a given website and task.

**Request body**

```json
{
  "url": "https://example.com",
  "task_description": "Complete the checkout process for a pair of shoes"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | Target website URL |
| `task_description` | string | Yes | Description of the task to test |

**Response** `200 OK`

```json
{
  "personas": [
    {
      "template_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Sarah Chen",
      "emoji": "👩‍💻",
      "reason": "As a power user, Sarah will quickly identify efficiency issues in the checkout flow that would frustrate experienced shoppers."
    }
  ]
}
```

### GET /personas/{id}

Get a study-specific persona instance by its UUID. Returns the persona profile as stored for a particular study.

**Response** `200 OK`

```json
{
  "id": "d2e3f4a5-b6c7-8901-defa-234567890123",
  "study_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "template_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "profile": { "name": "Sarah Chen", "tech_literacy": 9 },
  "is_custom": false,
  "created_at": "2026-02-16T14:30:00Z"
}
```

---

## 15. GitHub export

Export UX issues from a study to GitHub as structured issues or as a pull request containing fix files.

### Endpoint summary

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/studies/{id}/export/github` | Export issues as GitHub issues |
| `POST` | `/studies/{id}/export/github-pr` | Create a GitHub PR with fix files |

### POST /studies/{id}/export/github

Creates GitHub issues with severity labels, affected elements, heuristic violations, WCAG criteria, recommendations, and suggested fix code.

**Request body**

```json
{
  "repo": "owner/repo-name",
  "token": "ghp_xxxxxxxxxxxxxxxxxxxxx",
  "issue_ids": null
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `repo` | string | Yes | GitHub repository in `owner/repo` format |
| `token` | string | Yes | GitHub personal access token with `repo` scope |
| `issue_ids` | array[UUID] | No | Specific issue IDs to export. Exports all if omitted. |

**Response** `200 OK`

```json
{
  "study_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "total_issues": 14,
  "exported_count": 14,
  "results": [
    {
      "issue_id": "a5b6c7d8-e9f0-1234-abcd-567890123456",
      "github_url": "https://github.com/owner/repo-name/issues/42"
    }
  ]
}
```

### POST /studies/{id}/export/github-pr

Create a GitHub PR containing overlay fix files (CSS/JS) for UX issues. Generates `mirror-fixes.css`, `mirror-patches.js` (if JS fixes exist), and `MIRROR-FIXES.md` documentation.

Issues must have generated fixes (`fix_code` populated). Call `/fixes/generate` first if needed.

**Request body**

```json
{
  "repo": "owner/repo-name",
  "token": "ghp_xxxxxxxxxxxxxxxxxxxxx",
  "issue_ids": null
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `repo` | string | Yes | GitHub repository in `owner/repo` format |
| `token` | string | Yes | GitHub personal access token with `repo` scope |
| `issue_ids` | array[UUID] | No | Specific issue IDs to include. Defaults to all issues with fixes. |

**Response** `201 Created`

```json
{
  "pr_url": "https://github.com/owner/repo-name/pull/43",
  "pr_number": 43,
  "branch_name": "mirror/ux-fixes-f47ac10b",
  "files_created": [
    "mirror-fixes.css",
    "mirror-patches.js",
    "MIRROR-FIXES.md"
  ],
  "fixes_included": 8
}
```

---

## 16. Schedules

Schedules define recurring or webhook-triggered test runs. Each schedule stores a URL, tasks, and persona configuration that can be executed repeatedly.

### Endpoint summary

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/schedules` | Create a new schedule |
| `GET` | `/schedules` | List all schedules |
| `GET` | `/schedules/{id}` | Get a schedule by ID |
| `PATCH` | `/schedules/{id}` | Update schedule fields |
| `DELETE` | `/schedules/{id}` | Soft-delete a schedule |
| `POST` | `/schedules/{id}/trigger` | Manually trigger a schedule run |

### POST /schedules

Create a new schedule for recurring or webhook-triggered tests.

**Request body**

```json
{
  "name": "Weekly pricing page test",
  "url": "https://example.com",
  "starting_path": "/pricing",
  "tasks": [
    {
      "description": "Compare Pro and Enterprise plans",
      "order_index": 0
    }
  ],
  "persona_template_ids": [
    "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  ],
  "cron_expression": "0 9 * * 1"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Schedule name (max 255 chars) |
| `url` | string | Yes | Target website URL (max 2048 chars) |
| `starting_path` | string | No | Path to start navigation from (default `/`) |
| `tasks` | array | Yes | 1-3 task objects |
| `persona_template_ids` | array[UUID] | Yes | 1-10 persona template IDs |
| `cron_expression` | string | No | Cron expression for recurring runs (e.g., `0 9 * * 1` for every Monday at 9am) |

**Response** `201 Created`

```json
{
  "id": "d8e9f0a1-b2c3-4567-defg-890123456789",
  "name": "Weekly pricing page test",
  "url": "https://example.com",
  "starting_path": "/pricing",
  "tasks": [{ "description": "Compare Pro and Enterprise plans", "order_index": 0 }],
  "persona_template_ids": ["a1b2c3d4-e5f6-7890-abcd-ef1234567890"],
  "cron_expression": "0 9 * * 1",
  "webhook_secret": "wh_abc123def456",
  "status": "active",
  "last_run_at": null,
  "next_run_at": "2026-02-17T09:00:00Z",
  "last_study_id": null,
  "run_count": 0,
  "created_at": "2026-02-16T14:30:00Z",
  "updated_at": "2026-02-16T14:30:00Z"
}
```

### GET /schedules

List all non-deleted schedules.

**Response** `200 OK`

```json
{
  "items": [ "..." ],
  "total": 5
}
```

### GET /schedules/{id}

Get a schedule by its UUID.

**Response** `200 OK` -- same shape as the POST response.

### PATCH /schedules/{id}

Update schedule fields. Only provided fields are updated.

**Request body**

```json
{
  "name": "Updated schedule name",
  "cron_expression": "0 9 * * 5",
  "status": "paused",
  "tasks": null,
  "persona_template_ids": null
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | New schedule name |
| `cron_expression` | string | New cron expression |
| `status` | string | `active` or `paused` |
| `tasks` | array | Replacement task list |
| `persona_template_ids` | array[UUID] | Replacement persona list |

**Response** `200 OK` -- updated schedule object.

### DELETE /schedules/{id}

Soft-delete a schedule. It will no longer appear in list results or trigger runs.

**Response** `204 No Content`

### POST /schedules/{id}/trigger

Manually trigger a schedule run. Creates a new study from the schedule configuration and dispatches it to the worker queue.

**Response** `200 OK`

```json
{
  "schedule_id": "d8e9f0a1-b2c3-4567-defg-890123456789",
  "study_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "job_id": "arq:job:xyz789"
}
```

---

## 17. Deploy webhook

Trigger a schedule run via webhook. This endpoint is designed for CI/CD pipelines (e.g., post-deploy hooks) and does not require authentication -- the webhook secret serves as the authorization token.

### Endpoint summary

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/webhooks/deploy/{webhook_secret}` | Trigger a schedule run by its webhook secret |

### POST /webhooks/deploy/{webhook_secret}

| Parameter | Type | Description |
|-----------|------|-------------|
| `webhook_secret` | string (path) | The schedule's webhook secret (returned when the schedule is created) |

**Response** `200 OK`

```json
{
  "schedule_id": "d8e9f0a1-b2c3-4567-defg-890123456789",
  "study_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "job_id": "arq:job:xyz789",
  "message": "Study triggered successfully"
}
```

---

## 18. Score history

Longitudinal score tracking across multiple studies of the same URL.

### Endpoint summary

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/history/urls` | List all tested URLs with latest scores |
| `GET` | `/history/scores` | Get score history for a specific URL |

### GET /history/urls

List all URLs that have been tested, with study count and latest score.

**Response** `200 OK`

Returns an array of objects, each containing the URL, number of studies, and most recent score.

### GET /history/scores

Get the longitudinal score history for a specific URL.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | (required) | The URL to get history for |
| `limit` | integer | 50 | Maximum number of data points (max 200) |

**Response** `200 OK`

Returns a `ScoreHistoryResponse` object containing data points and trend information:

```json
{
  "url": "https://example.com",
  "data_points": [
    {
      "study_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "score": 72.5,
      "status": "complete",
      "created_at": "2026-02-16T14:30:00Z",
      "schedule_id": null
    }
  ],
  "total_studies": 5,
  "average_score": 68.3,
  "trend": "improving",
  "score_delta": 12.5
}
```

| Field | Type | Description |
|-------|------|-------------|
| `trend` | string | `improving`, `declining`, or `stable` |
| `score_delta` | float | Latest score minus earliest score |

---

## 19. Proxy

Reverse proxy that strips anti-framing headers so any site can be embedded in an iframe for live preview.

### Endpoint summary

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/proxy` | Fetch a URL with anti-framing headers removed |

### GET /proxy

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | URL to proxy |

Fetches the target URL and returns its content with `X-Frame-Options`, `Content-Security-Policy`, and `Content-Security-Policy-Report-Only` headers stripped. For HTML responses, a `<base>` tag is injected so relative URLs resolve correctly.

**Response** -- proxied content with original status code and filtered headers.

SSRF protection: private, loopback, reserved, and link-local IP addresses are blocked. Maximum response size is 10 MB.

---

## 20. WebSocket -- real-time progress

Mirror streams real-time study progress over a WebSocket connection. As each AI persona navigates the target site, the server pushes step-by-step updates including think-aloud narration, screenshots, emotional state, and task progress.

### Connection

```
ws://localhost:3000/api/v1/ws
wss://miror.tech/api/v1/ws
```

### Protocol

1. Client opens a WebSocket connection.
2. Client sends a `subscribe` message with the study ID.
3. Server immediately sends a `study:session_snapshot` with the current state of all sessions.
4. Server streams events as they occur in real time.
5. Client can switch subscriptions by sending another `subscribe` message.
6. Client sends `unsubscribe` to stop receiving events.

### Client-to-server messages

#### subscribe

```json
{
  "type": "subscribe",
  "study_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
}
```

#### unsubscribe

```json
{
  "type": "unsubscribe",
  "study_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
}
```

### Server-to-client events

#### study:session_snapshot

Sent immediately after subscribing. Contains the current state of all active sessions, useful for clients that connect mid-study or reconnect after a disconnect.

```json
{
  "type": "study:session_snapshot",
  "study_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "sessions": {
    "e3f4a5b6-c7d8-9012-efab-345678901234": {
      "session_id": "e3f4a5b6-c7d8-9012-efab-345678901234",
      "persona_name": "Sarah Chen",
      "step_number": 5,
      "think_aloud": "Looking for the navigation menu...",
      "screenshot_url": "/api/v1/screenshots/f47ac10b/e3f4a5b6/steps/step_005.png",
      "emotional_state": "curious",
      "action": { "type": "click", "description": "Clicking the hamburger menu" },
      "task_progress": 25.0,
      "completed": false,
      "total_steps": 5,
      "live_view_url": "https://www.browserbase.com/devtools-fullscreen/...",
      "browser_active": true
    }
  }
}
```

#### study:progress

Overall study progress update.

```json
{
  "type": "study:progress",
  "study_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "percent": 45.0,
  "phase": "navigating"
}
```

#### session:step

Emitted each time a persona takes an action. This is the primary real-time event for building live session views.

```json
{
  "type": "session:step",
  "session_id": "e3f4a5b6-c7d8-9012-efab-345678901234",
  "persona_name": "Sarah Chen",
  "step_number": 8,
  "think_aloud": "This pricing table is hard to read. The font is too small and the columns are not clearly separated.",
  "screenshot_url": "/api/v1/screenshots/f47ac10b/e3f4a5b6/steps/step_008.png",
  "emotional_state": "confused",
  "action": {
    "type": "scroll",
    "description": "Scrolling down to see more pricing details",
    "selector": null
  },
  "task_progress": 40.0,
  "confidence": 0.72,
  "ux_issues_found": 2,
  "page_url": "https://example.com/pricing",
  "live_view_url": "https://www.browserbase.com/devtools-fullscreen/..."
}
```

#### session:emotional_shift

Emitted when a persona's emotional state changes significantly.

```json
{
  "type": "session:emotional_shift",
  "session_id": "e3f4a5b6-c7d8-9012-efab-345678901234",
  "persona_name": "Sarah Chen",
  "step_number": 12,
  "from_emotion": "confused",
  "to_emotion": "frustrated",
  "intensity_delta": 3,
  "think_aloud": "I still cannot find where to compare these plans side by side."
}
```

#### session:complete

Emitted when a persona finishes their session (either by completing the task or giving up).

```json
{
  "type": "session:complete",
  "session_id": "e3f4a5b6-c7d8-9012-efab-345678901234",
  "completed": true,
  "total_steps": 18
}
```

#### study:analyzing

Emitted when navigation is complete and the analysis pipeline begins.

```json
{
  "type": "study:analyzing",
  "study_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "phase": "synthesis"
}
```

#### study:complete

Emitted when the entire study is finished, including analysis and report generation.

```json
{
  "type": "study:complete",
  "study_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "score": 72,
  "issues_count": 14
}
```

#### study:error

Emitted if the study encounters a fatal error.

```json
{
  "type": "study:error",
  "study_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "error": "All browser sessions failed to connect"
}
```

---

## 21. Health

### Endpoint summary

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Validate DB and Redis connectivity |
| `GET` | `/health/browser` | Report browser pool status |

### GET /health

Validates connectivity to PostgreSQL and Redis.

**Response** `200 OK`

```json
{
  "status": "ok",
  "db": "ok",
  "redis": "ok"
}
```

If a dependency is down, `status` becomes `"degraded"` and the failing component reports its error:

```json
{
  "status": "degraded",
  "db": "ok",
  "redis": "error: Connection refused"
}
```

### GET /health/browser

Reports browser pool status for monitoring cloud browser infrastructure.

**Response** `200 OK`

```json
{
  "status": "ok",
  "pool": {
    "mode": "cloud",
    "active_sessions": 2,
    "total_sessions_created": 15,
    "uptime_seconds": 3600,
    "crash_count": 0
  },
  "failover_active": false
}
```

If no browser pool has been initialized (no studies have been run), returns:

```json
{
  "status": "not_initialized",
  "message": "No active browser pool -- studies have not been run yet"
}
```

---

## 22. Assets

### GET /screenshots/{path}

Serves screenshot images captured during persona sessions. Paths are returned in step objects as `screenshot_path`.

**Response** `200 OK`
- Content-Type: `image/png`, `image/jpeg`, or `image/webp`
- Cache-Control: `public, max-age=86400`

**Example**

```
GET /api/v1/screenshots/f47ac10b/e3f4a5b6/steps/step_008.png
```

Returns the PNG screenshot for step 8 of the session.

---

## Error responses

All error responses follow this format:

```json
{
  "detail": "Study not found"
}
```

| Status Code | Meaning |
|-------------|---------|
| `400` | Bad request -- invalid parameters or request body |
| `401` | Unauthorized -- invalid GitHub token (GitHub export endpoints) |
| `403` | Forbidden -- insufficient permissions (GitHub export, SSRF protection on proxy) |
| `404` | Resource not found |
| `422` | Validation error -- request body failed schema validation |
| `429` | Rate limit exceeded (GitHub API) |
| `502` | AI service error -- LLM call failed (persona generation, recommendations, fix generation) |
| `503` | Service unavailable -- required external service not configured (e.g., ElevenLabs API key) |
| `504` | Gateway timeout -- upstream request timed out (proxy) |
| `500` | Internal server error |

Validation errors (422) include field-level detail:

```json
{
  "detail": [
    {
      "loc": ["body", "url"],
      "msg": "String should have at least 1 character",
      "type": "string_too_short"
    }
  ]
}
```
