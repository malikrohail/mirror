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

### Common Conventions

- All resource IDs are UUIDs.
- Timestamps use ISO-8601 format (`2026-02-16T14:30:00Z`).
- Paginated endpoints accept `page` (1-based) and `limit` query parameters.
- Successful creation returns `201 Created`. Deletion returns `204 No Content`.
- Errors follow a standard shape: `{ "detail": "Human-readable message" }`.

---

## 2. Studies

Studies are the top-level resource. A study targets a URL, defines one or more tasks for personas to complete, and selects which AI personas will navigate the site.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/studies` | Create a new study |
| `GET` | `/studies` | List studies with pagination |
| `GET` | `/studies/{id}` | Get study with full results |
| `DELETE` | `/studies/{id}` | Delete study and all associated data |
| `POST` | `/studies/{id}/run` | Start executing the study |
| `GET` | `/studies/{id}/status` | Poll study progress |

### POST /studies

Create a new study with tasks and selected persona templates.

**Request Body**

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

---

## 3. Sessions & Steps

A session represents one persona attempting one task. Each session contains a sequence of steps -- screenshot, think-aloud narration, browser action, and UX observations.

### Endpoints

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

---

## 4. Analysis

After all persona sessions complete, Mirror runs a multi-stage analysis pipeline: per-step UX auditing, cross-persona issue deduplication, insight synthesis, and heatmap generation.

### Endpoints

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
| `times_seen` | integer | Number of times this issue was observed across sessions |
| `is_regression` | boolean | Whether this issue was not present in a previous study of the same URL |
| `priority_score` | float | Computed priority based on severity and frequency |
| `fix_code` | string | Suggested code fix (when applicable) |

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

## 5. Reports

Mirror generates professional UX audit reports in Markdown and PDF formats. Reports include executive summaries, issue breakdowns, persona comparisons, and prioritized recommendations.

### Endpoints

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

## 6. Personas

Mirror includes 20+ pre-built AI persona templates spanning demographics, tech literacy levels, accessibility needs, and behavioral profiles. Custom personas can be generated from natural language descriptions.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/personas/templates` | List all persona templates |
| `GET` | `/personas/templates/{id}` | Get a specific template |
| `POST` | `/personas/generate` | Generate a custom persona from a description |
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

### POST /personas/generate

Generate a fully-formed persona from a natural language description using Claude Opus. The generated persona is saved as a custom template and can be selected in future studies.

**Request Body**

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
  }
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
| `options.accessibility_needs` | object | No | Flags for screen_reader, low_vision, color_blind, motor_impairment, cognitive |

**Response** `200 OK` -- Returns a full `PersonaTemplateOut` object (same shape as template list items).

### POST /personas/recommend

Uses Claude Sonnet to recommend the 5 best personas from the template library for a given website and task.

**Request Body**

```json
{
  "url": "https://example.com",
  "task_description": "Complete the checkout process for a pair of shoes"
}
```

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

---

## 7. WebSocket -- Real-Time Progress

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

### Client-to-Server Messages

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

### Server-to-Client Events

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

## 8. Health

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

---

## Assets

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

## Error Responses

All error responses follow this format:

```json
{
  "detail": "Study not found"
}
```

| Status Code | Meaning |
|-------------|---------|
| `400` | Bad request -- invalid parameters or request body |
| `404` | Resource not found |
| `422` | Validation error -- request body failed schema validation |
| `502` | AI service error -- LLM call failed (persona generation, recommendations) |
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
