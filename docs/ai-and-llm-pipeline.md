# AI & LLM Pipeline

This document describes how Mirror uses Claude (Anthropic's LLM) across its entire usability testing pipeline. It covers the five core pipeline stages, model selection strategy, the navigation agent loop, persona generation, vision-based analysis, configuration, observability, and error handling.

---

## Table of Contents

1. [Overview](#overview)
2. [The 5 Pipeline Stages](#the-5-pipeline-stages)
3. [Model Selection & Routing](#model-selection--routing)
4. [The Navigation Agent Loop](#the-navigation-agent-loop)
5. [Persona Engine](#persona-engine)
6. [Vision Analysis](#vision-analysis)
7. [Configuration](#configuration)
8. [Observability](#observability)
9. [Error Handling & Resilience](#error-handling--resilience)

---

## Overview

Mirror is an AI-powered usability testing platform. A single study run involves **200+ LLM API calls** distributed across five distinct pipeline stages. Each stage has different requirements for model capability, latency, and cost, so Mirror routes calls to different Claude models depending on the task.

The high-level flow is:

```
User creates study (URL + tasks + personas)
       |
       v
[Stage 1] Persona Generation ---- Opus 4.6 creates detailed persona profiles
       |
       v
[Stage 2] Navigation Loop -------- Haiku 4.5 drives real browsers per persona
       |                            (PERCEIVE -> THINK -> ACT -> RECORD)
       v
[Stage 3] Screenshot Analysis ----- Opus 4.6 performs deep visual UX audits
       |
       v
[Stage 4] Insight Synthesis ------- Opus 4.6 compares all personas' experiences
       |
       v
[Stage 5] Report Generation ------- Opus 4.6 produces the final PDF/Markdown report
```

All prompts live in `backend/app/llm/prompts.py`. All structured response schemas live in `backend/app/llm/schemas.py`. The LLM client with model routing, retries, and Langfuse integration is in `backend/app/llm/client.py`.

---

## The 5 Pipeline Stages

### Stage 1: Persona Generation

| Attribute | Value |
|-----------|-------|
| Default model | `claude-opus-4-6` |
| Vision | No |
| Input | Persona template (from library) or free-text description |
| Output | `PersonaProfile` JSON (name, age, behavioral attributes, accessibility needs) |
| Typical calls per study | 1-5 (one per persona, but template personas skip the LLM call) |

Opus generates a detailed, internally consistent persona profile from either a template or a natural language description. The profile includes five behavioral attributes on a 1-10 scale (`tech_literacy`, `patience_level`, `reading_speed`, `trust_level`, `exploration_tendency`), accessibility needs, frustration triggers, and behavioral notes.

**Optimization**: For pre-built template personas, Mirror constructs the `PersonaProfile` directly from stored template data without an LLM call, saving approximately 19 seconds per persona. Only custom personas with free-text descriptions require the Opus call.

Relevant code:
- `backend/app/llm/prompts.py` -- `persona_generation_system_prompt()`, `persona_from_template_prompt()`, `persona_from_description_prompt()`
- `backend/app/llm/schemas.py` -- `PersonaProfile`, `AccessibilityNeeds`
- `backend/app/core/persona_engine.py` -- `PersonaEngine`
- `backend/app/core/orchestrator.py` -- `_generate_persona_profiles()`, `_build_profile_from_template()`

### Stage 2: Navigation Decisions

| Attribute | Value |
|-----------|-------|
| Default model | `claude-haiku-4-5-20251001` |
| Vision | Yes (screenshot + accessibility tree) |
| Input | Screenshot image (JPEG-compressed), accessibility tree text, page URL/title, action history |
| Output | `NavigationDecision` JSON (think-aloud, action, UX issues, confidence, emotional state) |
| Typical calls per study | 50-150 (up to 30 steps per persona, 2-5 personas) |

This is the highest-volume stage. Each step in the navigation loop sends the current screenshot and accessibility tree to the LLM, which responds in character as the persona. The model decides what action to take (click, type, scroll, navigate, go back, done, give up) and reports any UX issues it encounters.

**Why Haiku**: Navigation decisions need to be fast (low latency) and happen many times. Haiku 4.5 provides acceptable quality at significantly lower cost and latency than Opus or Sonnet. The per-step output is constrained to 1024 tokens.

**Screenshot compression**: Before sending to the LLM, screenshots are compressed from PNG (~160KB) to JPEG (~25KB) using Pillow, downscaled to a maximum width of 1280px. This reduces upload time and token cost.

Relevant code:
- `backend/app/llm/prompts.py` -- `navigation_system_prompt()`, `navigation_user_prompt()`
- `backend/app/llm/schemas.py` -- `NavigationDecision`, `NavigationAction`, `UXIssue`, `ActionType`, `EmotionalState`
- `backend/app/llm/client.py` -- `navigate_step()`, `_compress_screenshot_for_llm()`
- `backend/app/core/navigator.py` -- `Navigator._execute_step()`

### Stage 3: Screenshot Analysis (Post-Session)

| Attribute | Value |
|-----------|-------|
| Default model | `claude-opus-4-6` |
| Vision | Yes (screenshot images) |
| Input | Screenshot image, page URL/title, optional persona context |
| Output | `ScreenshotAnalysis` JSON (assessment scores, issues, strengths, summary) |
| Typical calls per study | 10-30 (unique pages across all sessions) |

After navigation completes, Opus performs a deep visual UX audit on each unique page screenshot. This second pass is more thorough than the real-time navigation analysis -- it applies Nielsen's 10 usability heuristics and WCAG 2.1 guidelines systematically.

The analysis produces per-page assessment scores (visual clarity, information hierarchy, action clarity, error handling, accessibility, overall) on a 1-10 scale, plus a list of specific issues with severity, heuristic classification, and actionable recommendations.

**Batch analysis**: When `LLM_BATCH_ANALYSIS` is enabled, multiple screenshots are sent in a single multi-image API call to reduce round-trip overhead. Falls back to individual calls if the batch response cannot be parsed.

**Flow analysis** (multi-image): Steps are grouped into user flows (e.g., homepage -> product -> cart -> checkout), and Opus analyzes up to 5 consecutive screenshots to detect transition issues -- visual inconsistencies, information loss, and broken continuity between pages.

Relevant code:
- `backend/app/llm/prompts.py` -- `screenshot_analysis_system_prompt()`, `flow_analysis_system_prompt()`
- `backend/app/llm/schemas.py` -- `ScreenshotAnalysis`, `PageAssessment`, `FlowAnalysis`, `TransitionIssue`
- `backend/app/llm/client.py` -- `analyze_screenshot()`, `analyze_screenshots_batch()`, `analyze_flow()`
- `backend/app/core/analyzer.py` -- `Analyzer`

### Stage 4: Insight Synthesis

| Attribute | Value |
|-----------|-------|
| Default model | `claude-opus-4-6` (Sonnet 4.5 for small studies with <=2 sessions) |
| Vision | No |
| Input | All session summaries, all detected issues, task descriptions, study URL |
| Output | `StudySynthesis` JSON (executive summary, UX score, issues, struggle points, recommendations) |
| Typical calls per study | 1 |

The synthesis stage is the analytical core. Opus compares how different personas experienced the same website and produces:

- **Universal issues**: Problems all personas encountered (highest priority).
- **Persona-specific issues**: Problems only certain personas faced (indicates accessibility/inclusivity gaps).
- **Comparative insights**: Meaningful differences between personas (e.g., "tech-savvy user completed in 5 steps, elderly user needed 22 steps").
- **Struggle points**: Specific pages/elements where personas got stuck.
- **Recommendations**: Prioritized by impact vs. effort.
- **Overall UX score**: 0-100, with detailed scoring rules to prevent misleadingly low scores.

**Extended thinking**: For larger studies (>2 personas), synthesis uses Opus's extended thinking feature with an adaptive budget of 10,000 tokens. This allows the model to reason more deeply before producing the final output. The thinking trace is captured and stored alongside the synthesis result. For small studies, a budget of 5,000 tokens is used with Sonnet to optimize cost.

**Score floor**: A minimum score of 10 is enforced when there is navigational evidence (steps taken, issues found). A score of 0 is only valid if the site literally failed to load.

Relevant code:
- `backend/app/llm/prompts.py` -- `synthesis_system_prompt()`, `synthesis_user_prompt()`
- `backend/app/llm/schemas.py` -- `StudySynthesis`, `InsightItem`, `StrugglePoint`, `Recommendation`
- `backend/app/llm/client.py` -- `synthesize_study()`, `synthesize_study_with_thinking()`, `_call_with_thinking()`
- `backend/app/core/synthesizer.py` -- `Synthesizer`

### Stage 5: Report Generation

| Attribute | Value |
|-----------|-------|
| Default model | `claude-opus-4-6` (Sonnet 4.5 for small studies; template-based for small studies) |
| Vision | No |
| Input | Synthesis results, session summaries, task descriptions, study URL |
| Output | `ReportContent` JSON (title, executive summary, methodology, sections, conclusion) |
| Typical calls per study | 1 (or 0 for small studies using template reports) |

Opus generates a structured report suitable for both technical and non-technical stakeholders. The report includes required sections: Key Findings, Persona Comparison, Issue Analysis, Struggle Map, Recommendations, and Accessibility Assessment.

The `ReportContent` JSON is rendered to Markdown, then converted to PDF via WeasyPrint with custom CSS templates.

**Small study optimization**: For studies with 2 or fewer personas, the report is built directly from a template using the synthesis data, skipping the LLM call entirely. This makes small-study reports essentially instant.

Relevant code:
- `backend/app/llm/prompts.py` -- `report_generation_system_prompt()`, `report_generation_user_prompt()`
- `backend/app/llm/schemas.py` -- `ReportContent`, `ReportSection`
- `backend/app/llm/client.py` -- `generate_report()`
- `backend/app/core/report_builder.py` -- `ReportBuilder`

### Additional Stages

Beyond the five core stages, the pipeline includes:

| Stage | Model | Purpose |
|-------|-------|---------|
| Session Summary | Haiku 4.5 | Summarizes each persona's session after navigation completes |
| Fix Suggestions | Opus 4.6 | Generates copy-pasteable code fixes (CSS/HTML/JS) for UX issues (on-demand) |
| Accessibility Audit | Opus 4.6 | Deep WCAG 2.1 AA audit using vision to detect issues automated tools miss |
| Flow Analysis | Opus 4.6 | Multi-image analysis of page transitions for consistency and information loss |
| Test Planning | Opus 4.6 | Converts natural language descriptions into structured study configurations |

---

## Model Selection & Routing

### Model Map

The pipeline uses three Claude models, routed by stage:

```python
# From backend/app/llm/client.py
STAGE_MODEL_MAP = {
    "persona_generation":  "claude-opus-4-6",
    "navigation":          "claude-haiku-4-5-20251001",
    "screenshot_analysis": "claude-opus-4-6",
    "synthesis":           "claude-opus-4-6",
    "report_generation":   "claude-opus-4-6",
    "session_summary":     "claude-haiku-4-5-20251001",
    "fix_suggestion":      "claude-opus-4-6",
    "accessibility_audit": "claude-opus-4-6",
    "flow_analysis":       "claude-opus-4-6",
    "test_planning":       "claude-opus-4-6",
}
```

### Why Different Models?

| Model | Strengths | Used For | Tradeoff |
|-------|-----------|----------|----------|
| Opus 4.6 | Deepest reasoning, best at synthesis and nuanced analysis | Persona generation, screenshot analysis, synthesis, reports, accessibility audits | Highest cost and latency |
| Sonnet 4.5 | Good reasoning at moderate cost | Small-study synthesis and reports (dynamic override) | Mid-tier cost, good quality |
| Haiku 4.5 | Fastest response time, lowest cost | Navigation decisions, session summaries | Acceptable quality for constrained outputs |

### Dynamic Model Overrides

The `LLMClient` accepts `stage_model_overrides` at construction time. The orchestrator uses this to create a "fast" LLM client that routes synthesis and report generation to Sonnet for small studies:

```python
# From backend/app/core/orchestrator.py
self._fast_llm = LLMClient(stage_model_overrides={
    "synthesis": SONNET_MODEL,
    "report_generation": SONNET_MODEL,
})
```

Models can also be overridden via environment variables (`OPUS_MODEL`, `SONNET_MODEL`, `HAIKU_MODEL`).

### Cost Considerations

A typical study with 3 personas and 20 steps each generates roughly:

- **Navigation**: ~60 Haiku calls (cheapest)
- **Screenshot analysis**: ~15 Opus calls (most expensive per-call, but fewer calls)
- **Synthesis**: 1 Opus call with extended thinking
- **Report**: 1 Opus call (or 0 for small studies)
- **Session summaries**: 3 Haiku calls

The orchestrator tracks costs in real-time via `CostTracker` and publishes running cost estimates to the frontend through WebSocket events.

---

## The Navigation Agent Loop

The navigation loop is the core of Mirror's browser automation. Each persona gets its own `Navigator` instance that drives a Playwright browser through the target website. The loop follows a four-phase cycle:

```
   +-----------+     +---------+     +-------+     +----------+
   | PERCEIVE  | --> | THINK   | --> | ACT   | --> | RECORD   |
   | screenshot|     | LLM call|     | click/|     | save step|
   | + a11y    |     | (Haiku) |     | type/ |     | + publish|
   | tree      |     |         |     | scroll|     | WebSocket|
   +-----------+     +---------+     +-------+     +----------+
         ^                                              |
         |______________________________________________|
                    repeat until done/stuck/max_steps
```

### Phase 1: PERCEIVE

Captures the current state of the page:
- Takes a full-page screenshot via Playwright
- Extracts the accessibility tree (text representation of page elements)
- Gets page metadata (URL, title, viewport dimensions)
- Optionally computes a visual diff score against the previous step's screenshot to detect "nothing happened" clicks

```python
# From backend/app/core/navigator.py
screenshot = await self._screenshots.capture_screenshot(page)
a11y_tree = await self._screenshots.get_accessibility_tree(page)
metadata = await self._screenshots.get_page_metadata(page)
```

### Phase 2: THINK

Sends the screenshot and accessibility tree to the LLM. The system prompt injects the persona's full identity (name, age, occupation, all behavioral attributes, behavioral notes). The model responds in character:

- **Think-aloud**: First-person narration reflecting the persona's experience ("I see a big button but I'm not sure what it does...")
- **Action**: What to do next (click a selector, type text, scroll, navigate, go back, declare done, or give up)
- **UX issues**: Any problems detected from the persona's perspective, classified by severity and Nielsen heuristic
- **Confidence**: 0.0-1.0 confidence in the chosen action
- **Task progress**: 0-100% estimate of how close the task is to completion
- **Emotional state**: One of `confident`, `curious`, `neutral`, `hesitant`, `confused`, `frustrated`, `satisfied`, `anxious`

The accessibility tree is truncated to 4,000 characters. Action history is limited to the last 5 steps to stay within token budget.

### Phase 3: ACT

Executes the LLM's chosen action via Playwright:

- `click` -- Click an element by CSS selector
- `type` -- Type text into an input field
- `scroll` -- Scroll up/down or to a specific element
- `navigate` -- Go to a URL directly
- `wait` -- Wait for content to load
- `go_back` -- Browser back
- `done` -- Task completed successfully
- `give_up` -- Cannot complete the task

Before executing a click action, the navigator resolves the click coordinates from the CSS selector for heatmap data collection.

Actions include retry logic: transient Playwright failures (TimeoutError, TargetClosedError) are retried up to `BROWSER_ACTION_RETRIES` times with a 500ms delay.

### Phase 4: RECORD

Fires as a background `asyncio.Task` so the next step's PERCEIVE phase can start immediately:

1. Publishes a WebSocket event to Redis so the frontend receives the real-time update (think-aloud, screenshot URL, emotional state, action description)
2. Persists the full step data (screenshot file, metadata JSON) to storage

All background record tasks are collected and awaited before the session closes, ensuring no data is lost.

### Termination Conditions

The loop ends when any of these conditions is met:

| Condition | Description |
|-----------|-------------|
| `action.type == "done"` | Persona declared the task complete |
| `action.type == "give_up"` | Persona gave up (too frustrated or lost) |
| `task_progress >= 95` | Persona reported near-complete progress |
| Stuck detection | Same URL + no progress for 3 consecutive steps |
| Consecutive action failures | Last 3 actions all failed |
| Max steps reached | Hit `MAX_STEPS_PER_SESSION` (default: 30) |
| Session timeout | Exceeded `SESSION_TIMEOUT_SECONDS` (default: 180s) |

### Agentic Navigation (Tool Use)

An alternative navigation mode uses Anthropic's tool_use API. Instead of a single JSON response, the model can call tools (`click_element`, `type_text`, `scroll_page`, `check_result`, `read_element`) in a multi-turn loop, verify results, and retry on failure -- all within a single navigation step. This is defined in `LLMClient.navigate_with_tools()`.

---

## Persona Engine

### How Personas Are Generated

Mirror supports three persona generation paths:

1. **Pre-built templates** (20+ archetypes): Stored in `backend/app/data/persona_templates.json`. Template data is converted directly to `PersonaProfile` objects without an LLM call. String-valued attributes like `"high"` and `"low"` are mapped to integers (e.g., `"high" -> 8`, `"low" -> 2`).

2. **Custom from description**: A free-text description like "A 70-year-old retired teacher who is not very tech-savvy" is sent to Opus, which generates a full `PersonaProfile` with all attributes filled in consistently.

3. **Random generation**: Opus generates a diverse persona from scratch when no template or description is provided.

### PersonaProfile Schema

```python
class PersonaProfile(BaseModel):
    name: str                          # Archetype label (e.g., "Anxious First-Time Buyer")
    age: int                           # 13-95
    occupation: str
    emoji: str                         # Single emoji avatar
    short_description: str             # Max 200 chars
    background: str                    # 2-3 sentence backstory

    # Behavioral attributes (1-10 scale)
    tech_literacy: int                 # 1=barely uses computer, 10=software engineer
    patience_level: int                # 1=gives up immediately, 10=infinite patience
    reading_speed: int                 # 1=skims everything, 10=reads every word
    trust_level: int                   # 1=very skeptical, 10=trusts everything
    exploration_tendency: int          # 1=laser-focused on task, 10=explores everything

    device_preference: str             # "desktop", "mobile", "tablet"
    frustration_triggers: list[str]    # 3-5 specific triggers
    goals: list[str]                   # 2-3 personal goals
    accessibility_needs: AccessibilityNeeds  # screen_reader, low_vision, color_blind, etc.
    behavioral_notes: str              # Derived behavioral rules for the navigation prompt
```

### How Personas Influence Navigation

The `PersonaEngine.get_behavioral_modifiers()` method translates numeric attributes into concrete behavioral rules injected into the navigation prompt. Examples:

| Attribute | Low (1-3) | High (8-10) |
|-----------|-----------|-------------|
| `tech_literacy` | "Icons without text labels confuse you. Dropdown menus are not obvious." | "You quickly scan pages. You skip tutorials. You notice developer-facing issues." |
| `patience_level` | "After 2-3 failed attempts you consider giving up. Long forms feel like too much work." | "You are persistent and methodical. You'll try multiple approaches before giving up." |
| `reading_speed` | "You barely read body text. You scan for headings, buttons, and links. You may miss important instructions." | "You read everything -- every label, every description, every footnote." |
| `trust_level` | "You hesitate before entering personal information. Required phone number fields feel invasive." | "You generally fill out forms without hesitation. You click CTAs readily." |
| `exploration_tendency` | "You go straight for the goal. You ignore side content and promotional banners." | "You browse around before committing. You check navigation menus, footer links, about pages." |

Accessibility needs add additional rules (e.g., "SCREEN READER USER: You rely on headings, ARIA labels, and semantic HTML. Unlabeled buttons are meaningless.").

---

## Vision Analysis

Mirror uses Claude's vision capability in two contexts:

### Real-Time Navigation (Stage 2)

During navigation, each step sends a JPEG-compressed screenshot (max 1280px wide, quality 60) alongside the accessibility tree. The model uses both to:
- Understand the current page layout
- Identify interactive elements
- Detect visible UX issues from the persona's perspective
- Decide the next action

### Deep Post-Session Audit (Stage 3)

After navigation completes, Opus performs a thorough visual audit of each unique page:
- Applies all 10 Nielsen heuristics systematically
- Checks WCAG 2.1 guidelines
- Produces per-page scores on six dimensions
- Identifies issues that the real-time pass may have missed

### Accessibility Deep Audit

A dedicated accessibility audit uses Opus vision to detect issues that automated tools cannot:
- Actual color contrast from rendered screenshots (not just CSS values)
- Touch target sizes from visual layout
- Text-over-image readability
- Visual grouping and proximity issues
- Icon-only actions without labels
- Focus indicator visibility

Results include WCAG criterion codes, measured vs. required values, and bounding box coordinates for affected elements.

### Issue Classification

All detected issues are classified into four types:

| Type | Description | Examples |
|------|-------------|----------|
| `ux` | General usability | Layout, flow, clarity, readability, confusing labels |
| `accessibility` | WCAG/a11y issues | Contrast, keyboard nav, screen reader, alt text, focus |
| `error` | Broken functionality | Failed clicks, 404s, unresponsive elements, dead links |
| `performance` | Speed issues | Slow loads, lag, timeouts, large images |

Each issue is tagged with a severity (`critical`, `major`, `minor`, `enhancement`), the violated Nielsen heuristic, an optional WCAG criterion, and a specific recommendation.

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | (required) | Anthropic API key for all LLM calls |
| `OPUS_MODEL` | `claude-opus-4-6` | Model ID for Opus pipeline stages |
| `SONNET_MODEL` | `claude-sonnet-4-5-20250929` | Model ID for Sonnet pipeline stages |
| `HAIKU_MODEL` | `claude-haiku-4-5-20251001` | Model ID for Haiku pipeline stages (set via env in `client.py`) |
| `MAX_CONCURRENT_SESSIONS` | `5` | Maximum personas navigating in parallel |
| `MAX_STEPS_PER_SESSION` | `30` | Maximum navigation steps per persona |
| `STUDY_TIMEOUT_SECONDS` | `600` | Global timeout for the entire study |
| `SESSION_TIMEOUT_SECONDS` | `180` | Per-session timeout for individual persona navigation |
| `BROWSER_ACTION_RETRIES` | `1` | Number of retries for transient Playwright failures |
| `SCREENSHOT_DIFF_ENABLED` | `false` | Enable visual diff scoring between navigation steps |
| `LLM_BATCH_ANALYSIS` | `false` | Batch screenshots into a single analysis API call |
| `FIRECRAWL_API_KEY` | (optional) | Enables site pre-crawling before navigation |

### LLM Client Internals

| Constant | Value | Description |
|----------|-------|-------------|
| `MAX_RETRIES` | `3` | API call retry limit per LLM call |
| `BASE_RETRY_DELAY` | `1.0s` | Initial retry delay (exponential backoff: 1s, 2s, 4s) |
| Navigation `max_tokens` | `1024` | Output token limit for navigation decisions |
| Synthesis `max_tokens` | `8192` | Output token limit for study synthesis |
| Report `max_tokens` | `6000` | Output token limit for report generation |
| Default `max_tokens` | `4096` | Output token limit for other stages |
| Thinking budget (large study) | `10000` | Extended thinking token budget |
| Thinking budget (small study) | `5000` | Extended thinking token budget |

---

## Observability

### Langfuse Integration

Mirror integrates with [Langfuse](https://langfuse.com) for LLM observability. When configured (`LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` environment variables), every LLM call is traced with:

- **Trace name**: `mirror-{stage}` (e.g., `mirror-navigation`, `mirror-synthesis`)
- **Tags**: Stage name, model name, `mirror`, optional `thinking` tag
- **Metadata**: Study ID, persona name, max tokens
- **Generation tracking**: Input (truncated system prompt, message count), output (truncated response), token usage (input + output)
- **Session grouping**: All traces for a study are grouped under a single Langfuse session via `session_id`

### Study-Level Scores

At study completion (or failure), Mirror pushes aggregate scores to Langfuse:

```python
scores = {
    "overall_ux_score": 72,
    "task_completion_rate": 0.66,
    "total_issues": 14,
    "total_cost_usd": 0.1234,
    "sessions_completed": 2,
    "sessions_gave_up": 1,
    "total_steps": 45,
}
```

On failure, a `study_failed` score is pushed with the failure reason.

### Token Usage Tracking

The `TokenUsage` class aggregates input and output tokens across all API calls for a study. The orchestrator transfers these totals to the `CostTracker`, which computes cost breakdowns by model tier and publishes running cost estimates to the frontend via WebSocket.

### What You Can Monitor in Langfuse

- **Cost per study**: Total token usage and estimated USD cost
- **Cost per stage**: Which pipeline stages consume the most tokens
- **Latency**: Per-call and per-stage response times
- **Error rates**: Failed API calls, JSON parse failures, retries
- **Model performance**: Compare quality/speed across model versions
- **Extended thinking usage**: How much thinking budget is consumed

---

## Error Handling & Resilience

### LLM Call Retries

Every API call goes through `LLMClient._call()` which implements:

- **Retry on rate limit** (`429`): Exponential backoff (1s, 2s, 4s), up to 3 attempts
- **Retry on server error** (`5xx`): Same exponential backoff
- **No retry on client error** (`4xx` except 429): Fails immediately
- **Langfuse error tracking**: Failed calls are logged to Langfuse with `level="ERROR"`

### JSON Parse Resilience

LLM responses must be valid JSON matching Pydantic schemas. The parsing pipeline (`_parse_json_response`) handles common issues:

1. Strip markdown code fences (` ```json ... ``` `)
2. Try parsing as-is
3. Extract the JSON object from surrounding text (handles models adding explanatory text)
4. Repair common LLM JSON quirks: trailing commas, invalid escape sequences, unescaped control characters, smart quotes, truncated strings, unbalanced brackets
5. If all parsing fails, retry the LLM call with an explicit "respond with ONLY valid JSON" instruction

### Navigation Stuck Detection

The `Navigator._is_stuck()` method detects two stuck patterns:

1. **URL stuck**: Same page URL for 3 consecutive steps with no task progress increase
2. **Action failure stuck**: Last 3 actions all produced errors

When stuck, the session ends with `gave_up=True`.

### Session Timeout

Each persona's navigation session is wrapped in `asyncio.wait_for()` with a configurable timeout (`SESSION_TIMEOUT_SECONDS`, default 180s). On timeout, the session returns a `NavigationResult` with `gave_up=True` and an error message.

### Study Timeout

The entire study (all parallel navigation sessions) is bounded by `STUDY_TIMEOUT_SECONDS` (default 600s). On timeout, the study status is set to `FAILED`.

### Browser Crash Recovery

- **Action retries**: Playwright action failures (TimeoutError, TargetClosedError) are retried up to `BROWSER_ACTION_RETRIES` times
- **Page navigation retry**: `_goto_with_retry()` retries initial page loads
- **Per-step error isolation**: If a single step throws an exception, it is logged as an error step and the loop continues to the next step
- **Session isolation**: Each persona runs in its own database session to prevent concurrent transaction corruption
- **Hybrid failover**: When `HYBRID_FAILOVER_ENABLED` is true, if local Chromium instances crash more than `HYBRID_CRASH_THRESHOLD` times, the browser pool automatically fails over to cloud browsers (Browserbase)

### Non-Fatal Failures

Several pipeline components are designed to fail gracefully without aborting the study:

| Component | Failure Behavior |
|-----------|-----------------|
| Firecrawl pre-crawl | Navigation proceeds without sitemap context |
| Accessibility audit | Study completes without a11y report |
| Flow analysis | Study completes without flow transition data |
| Heatmap generation | Study completes without heatmap images |
| PDF generation | Markdown report is still saved |
| Langfuse tracing | Study proceeds without observability |
| Cookie consent dismissal | Navigation continues normally |
| Background record tasks | Logged as errors but never crash the navigation loop |

### Score Floor

The synthesis stage enforces a minimum UX score when there is navigational evidence. A score of 0 is only valid when the website literally failed to load. If personas navigated and found issues, the minimum score is `10 + (peak_task_progress / 5)`, capped at 20.

The scoring rules also distinguish between website UX failures (penalized) and persona limitations (not penalized), such as inability to fill CAPTCHAs, provide real personal information, or complete 2FA.
