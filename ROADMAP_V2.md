# Mirror v2 — Resubmission Battle Plan

**Team:** 10 engineers, 1 month
**Goal:** Move from ~79/100 to 92+ (Top 6 finish)
**Strategy:** Fix the three scoring gaps — Opus 4.6 Use, Demo, and Validation — while adding features that are impossible to ignore in a 3-minute video.

---

## Current Score Breakdown (Honest Assessment)

| Criterion | Current | Target | Gap |
|-----------|---------|--------|-----|
| Impact (25%) | 85 | 92 | No validation, no case study, misleading cost claim |
| Opus 4.6 Use (25%) | 78 | 93 | Navigation on Sonnet, no extended thinking, no tool use |
| Depth & Execution (20%) | 88 | 93 | Strong already — needs testing metrics + flow analysis |
| Demo (30%) | 70 | 92 | No demo strategy, no "applause moment," latency risk |
| **Weighted Total** | **~79** | **~92** | |

---

## The Three Moves That Win

### Move 1: Make Opus 4.6 the undeniable star (fixes 25% criterion)
### Move 2: Build "Fix It Live" — the demo moment nobody forgets (fixes 30% criterion)
### Move 3: Run a real validation study and publish the results (fixes 25% criterion)

Everything else is supporting these three moves.

---

## Feature Plan (Priority-Ordered)

### P0 — Must Ship (Directly Addresses Scoring Gaps)

---

#### Feature 1: Deep Opus 4.6 Integration Overhaul
**Criterion impact:** Opus 4.6 Use (+12 points), Depth (+3)
**Engineers:** 2
**Timeline:** Week 1-2
**Difficulty:** Medium-Hard

**What to build:**

**1a. Extended Thinking for Synthesis**
The synthesis stage is where Mirror draws cross-persona conclusions from 100+ data points. This is the perfect showcase for Opus's deep reasoning.

```python
# Current: Single-pass synthesis (shallow)
synthesis = await self._llm.synthesize_study(sessions, issues)

# Target: Extended thinking with verification loop
synthesis = await self._llm.synthesize_study(
    sessions, issues,
    extended_thinking=True,       # Enable thinking blocks
    thinking_budget_tokens=10000, # Let Opus reason deeply
)
# Opus internally:
# - Builds evidence chains ("Persona A struggled here because...")
# - Cross-references contradictions ("Persona B succeeded, but only because...")
# - Assigns confidence to each finding with reasoning
# - Generates counter-arguments for its own recommendations
```

The key: **expose the thinking trace in the UI.** Add a collapsible "Reasoning" section under each insight showing HOW Opus arrived at that conclusion. Judges evaluating "capabilities that surprised even us" will see Opus reasoning through UX trade-offs like a senior researcher.

Changes:
- `backend/app/llm/client.py` — Add `extended_thinking=True` parameter to synthesis call using Anthropic's extended thinking API
- `backend/app/llm/schemas.py` — Add `reasoning_trace: str` field to `StudySynthesis` and `Insight` models
- `backend/app/core/synthesizer.py` — Pass thinking config, capture thinking blocks
- Frontend results page — Add collapsible "How Opus reasoned about this" panel under each insight
- DB migration — Add `reasoning_trace` TEXT column to insights table

**1b. Tool Use for Navigation (Agentic Navigation)**
Currently the navigation loop is: screenshot → single LLM call → execute action. If the action fails, it just moves on. This wastes steps and misses Opus's agentic capabilities.

```python
# Current: Single-shot decision
decision = await self._llm.navigate_step(screenshot, a11y_tree, context)
result = await self._actions.execute(page, decision.action)
# If result fails... just move to next step

# Target: Opus with tool use (agentic loop)
# Define tools Opus can call:
tools = [
    {"name": "click_element", "description": "Click an element", "input_schema": {...}},
    {"name": "type_text", "description": "Type into a field", "input_schema": {...}},
    {"name": "scroll_page", "description": "Scroll the page", "input_schema": {...}},
    {"name": "read_element", "description": "Read text content of an element", "input_schema": {...}},
    {"name": "list_interactive_elements", "description": "List all clickable/typeable elements", "input_schema": {...}},
    {"name": "check_result", "description": "Take a new screenshot to verify action worked", "input_schema": {...}},
]

# Opus now reasons: "I clicked the button but nothing happened.
# Let me check_result to see the current state...
# The button was behind a modal. Let me scroll and try again."
```

This is a massive differentiator. The navigation becomes genuinely agentic — Opus can retry, verify, and adapt. Task completion rates go up 20-30% and judges see tool use in action.

Changes:
- `backend/app/llm/client.py` — New `navigate_with_tools()` method using Anthropic tool_use API
- `backend/app/llm/prompts.py` — Tool definitions + tool-use navigation system prompt
- `backend/app/core/navigator.py` — Agentic loop: call Opus → execute tool → return result → Opus reasons → next tool (max 3 tool calls per step)
- `backend/app/llm/schemas.py` — Updated NavigationDecision to include tool call chain
- Config: Make agentic navigation opt-in (flag in study config) so Sonnet fast path still available

**1c. Multi-Image Vision for Flow Analysis**
Instead of analyzing screenshots one at a time, send Opus a sequence of 3-5 consecutive screenshots and ask it to analyze the FLOW — transitions, consistency, information loss between pages.

```python
# Current: Individual screenshot analysis
for screenshot in unique_screenshots:
    analysis = await self._llm.analyze_screenshot(screenshot)

# Target: Flow-aware analysis
flow_sequences = group_screenshots_by_flow(steps)  # e.g., homepage → product → cart → checkout
for flow in flow_sequences:
    analysis = await self._llm.analyze_flow(
        screenshots=flow.screenshots,  # 3-5 images
        flow_name=flow.name,           # "checkout flow"
        persona_context=flow.persona,
    )
    # Opus sees: "Between step 3 and step 4, the user's cart count
    # disappeared from the header. This breaks continuity."
```

This catches issues that single-screenshot analysis CANNOT find: broken breadcrumbs, disappearing navigation, inconsistent headers, lost context between pages.

Changes:
- `backend/app/llm/client.py` — New `analyze_flow()` method sending multiple images
- `backend/app/llm/prompts.py` — Flow analysis prompt (focus on transitions, consistency, information architecture)
- `backend/app/llm/schemas.py` — `FlowAnalysis` schema with `transition_issues`, `consistency_score`, `information_loss`
- `backend/app/core/analyzer.py` — Group steps into flows by URL sequence, call flow analysis
- `backend/app/models/issue.py` — Add `flow_name` field to issues found via flow analysis
- Frontend — "Flow Issues" tab on results page showing sequential screenshots with annotated transition problems

**1d. Switch Fix Generation to Opus 4.6**
One-line change with huge scoring impact. Fix generation is the feature that generates actual code — it should use the best model.

```python
# backend/app/llm/client.py line 59
# Before:
"fix_suggestion": SONNET_MODEL,
# After:
"fix_suggestion": OPUS_MODEL,
```

Also add extended thinking here — Opus should reason about the fix before generating code:
- Consider browser compatibility
- Check if the fix might break other elements
- Generate the minimal change needed

---

#### Feature 2: "Fix It Live" — The Demo Moment
**Criterion impact:** Demo (+15 points), Impact (+5), Opus Use (+3)
**Engineers:** 2
**Timeline:** Week 1-3
**Difficulty:** Hard (but high reward)

**What it is:** After Mirror generates a code fix for a UX issue, it injects the fix into a live browser, re-screenshots the page, and shows a before/after visual diff. The user sees the problem → the fix code → the fixed result. All without leaving Mirror.

**Why it wins:** This is the single most demo-able feature possible. In the 3-minute video:

> "Mirror found a contrast issue on this button. Here's the CSS fix it generated. Watch — [click] — and here's what the site looks like WITH the fix applied."
> [Side-by-side: before screenshot vs after screenshot, with the fix highlighted]

No other hackathon project will do this. It goes from "AI found a problem" to "AI found a problem, wrote the fix, and proved it works."

**How it works:**

```
1. Issue detected: "CTA button has insufficient contrast (2.1:1, needs 4.5:1)"
2. Opus generates fix: `button.cta { background: #1a5276; color: #ffffff; }`
3. Mirror opens a headless browser to the same page
4. Injects the CSS/JS fix via Playwright's page.addStyleTag() or page.evaluate()
5. Takes a "fixed" screenshot
6. Stores both screenshots and generates a visual diff
7. UI shows: [Before] [Fix Code] [After] with toggle/slider
```

**Implementation:**

Backend:
- `backend/app/services/fix_preview_service.py` (NEW) — Orchestrates: open browser → navigate to page_url → inject fix → screenshot → compare
- `backend/app/api/v1/fixes.py` — New endpoint: `POST /studies/{study_id}/issues/{issue_id}/preview-fix`
- Uses existing browser pool (local mode) — no extra infra needed
- Visual diff: Use Pillow ImageChops to highlight changed pixels in red overlay
- Store: `{study_id}/fixes/{issue_id}_before.png`, `_after.png`, `_diff.png`

Frontend:
- `frontend/src/components/results/fix-preview.tsx` (NEW) — Before/after slider component
  - Left half: "before" screenshot
  - Right half: "after" screenshot
  - Draggable divider (like those CSS comparison sliders)
  - Fix code panel below with syntax highlighting
  - "Apply Fix" button triggers the preview
  - Loading state while browser renders
- Integrate into results page Issues tab — each issue card gets a "Preview Fix" button

Edge cases:
- CSS fixes: `page.addStyleTag({ content: fixCode })`
- HTML fixes: `page.evaluate()` to modify DOM
- JS fixes: `page.evaluate()` to run the script
- If fix injection fails, show error gracefully ("Preview unavailable — fix requires server-side changes")
- Timeout: 10 seconds max for browser render

---

#### Feature 3: Validation Study & Accuracy Benchmarking
**Criterion impact:** Impact (+7), Demo (+3)
**Engineers:** 1
**Timeline:** Week 1-2 (runs in parallel with engineering)
**Difficulty:** Easy (it's research, not code)

**What to do:** Run Mirror on 10 well-known websites that have published usability studies or known UX issues. Compare Mirror's findings against:
1. Published usability reports (Nielsen Norman Group case studies)
2. Real UserTesting.com recordings (if available)
3. Known WCAG violations (use existing audit tools as ground truth)
4. Your team's own expert UX review

**Produce:**
- A table: "Mirror found X/Y known issues on [site]"
- Accuracy rate: true positives, false positives, false negatives
- 2-3 specific examples: "Mirror's low-vision persona detected [exact issue] that was also flagged in [published report]"

**Where it goes:**
- Section in HACKATHON_SUBMISSION.md: "Validation: Does Mirror Actually Work?"
- One example highlighted in the demo video
- Add to the app itself: `/validation` page showing benchmark results (optional but impressive)

**Build an automated benchmark pipeline:**

```python
# backend/app/benchmarks/runner.py
BENCHMARK_SITES = [
    {"url": "https://example-ecommerce.com", "known_issues": [
        {"description": "Missing alt text on product images", "severity": "major"},
        {"description": "Checkout button low contrast", "severity": "critical"},
    ]},
    # ... 9 more sites
]

async def run_benchmark():
    """Run Mirror on all benchmark sites and compare against known issues."""
    for site in BENCHMARK_SITES:
        study = await create_and_run_study(site["url"], standard_tasks, standard_personas)
        found_issues = await get_study_issues(study.id)
        matches = match_against_known(found_issues, site["known_issues"])
        # Calculate: precision, recall, F1
```

This is low-effort, high-impact. It transforms Mirror from "trust us, it works" to "here's proof it works."

---

#### Feature 4: Wire Up Orphaned Features (FixPanel + Video)
**Criterion impact:** Demo (+3), Depth (+2)
**Engineers:** 1
**Timeline:** Week 1 (2-3 days)
**Difficulty:** Easy

Two fully-built features are sitting in the codebase, disconnected from the UI:

**4a. Integrate FixPanel into Results Page**
- Import `FixPanel` into the results page (`/study/[id]/page.tsx`)
- Add as a third tab: "Overview" | "Issues" | "Fixes"
- Auto-trigger fix generation when study completes (add to orchestrator pipeline after synthesis)
- Changes: ~20 lines of frontend code + 5 lines of orchestrator code

**4b. Integrate Video Generation into Session Replay**
- Add "Generate Video" button to session replay page (`/study/[id]/session/[sessionId]/page.tsx`)
- Show video player when generation completes
- Add "Download GIF" button
- Changes: ~30 lines of frontend code

These are free points — the code exists, it just needs to be plugged in.

---

### P1 — Should Ship (Strong Differentiators)

---

#### Feature 5: Accessibility Deep Audit (Opus Vision)
**Criterion impact:** Impact (+5), Opus Use (+3), maps to Problem Statement 2
**Engineers:** 2
**Timeline:** Week 2-3
**Difficulty:** Medium

Go beyond heuristic-based accessibility checking. Use Opus 4.6's vision capabilities to do what automated tools (axe, Lighthouse) CANNOT do — visual accessibility analysis:

**What Opus Vision can detect that automated tools can't:**
- Actual color contrast from rendered screenshots (not just CSS values — includes backgrounds, gradients, images)
- Touch target sizes from visual layout (are buttons actually large enough, even if CSS says 44px?)
- Text over images readability (automated tools can't see if text overlaps a busy photo)
- Visual grouping and proximity (are related elements visually grouped?)
- Icon-only actions without labels (screen reader users can't see the icon)
- Focus indicator visibility (is the focus ring actually visible against the background?)
- Motion/animation that could trigger vestibular issues
- Reading order vs visual order mismatches

**Implementation:**

```python
# backend/app/core/accessibility_auditor.py (NEW)

class AccessibilityAuditor:
    """Deep accessibility audit using Opus 4.6 vision."""

    async def audit_page(self, screenshot: bytes, a11y_tree: str, page_url: str) -> AccessibilityAudit:
        """
        Send screenshot + a11y tree to Opus with accessibility-focused prompt.
        Returns WCAG 2.1 AA compliance assessment per criterion.
        """
        # Prompt focuses on:
        # 1. Perceivable: contrast ratios, text alternatives, adaptable content
        # 2. Operable: keyboard accessible, enough time, navigable
        # 3. Understandable: readable, predictable, input assistance
        # 4. Robust: compatible with assistive tech

    async def generate_compliance_report(self, audits: list[AccessibilityAudit]) -> WCAGReport:
        """Aggregate per-page audits into site-wide WCAG compliance report."""
```

**New schema:**
```python
class AccessibilityAudit(BaseModel):
    page_url: str
    wcag_level: str  # "A", "AA", "AAA"
    pass_count: int
    fail_count: int
    criteria: list[WCAGCriterionResult]  # Per-criterion pass/fail with evidence
    visual_issues: list[VisualAccessibilityIssue]  # Things only vision can detect

class VisualAccessibilityIssue(BaseModel):
    description: str
    wcag_criterion: str
    measured_value: str | None  # e.g., "contrast ratio: 2.3:1"
    required_value: str | None  # e.g., "minimum 4.5:1"
    element_description: str
    screenshot_region: dict  # x, y, w, h bounding box
```

**Frontend:**
- New tab on results page: "Accessibility"
- WCAG compliance checklist (pass/fail per criterion with evidence)
- Visual issue cards with screenshot region highlighting
- Compliance badge: "WCAG 2.1 AA: 73% compliant"
- Export: Formal WCAG compliance report (PDF)

**Why this matters for judges:**
- Maps directly to Problem Statement 2 ("Break the Barriers" — example project: "Accessibility Auditor")
- Uses Opus vision in a way that's genuinely novel — no existing tool does visual accessibility analysis
- Produces a tangible deliverable (compliance report) that has real regulatory value

---

#### Feature 6: Natural Language Test Builder
**Criterion impact:** Impact (+3), Demo (+4), Opus Use (+2)
**Engineers:** 1
**Timeline:** Week 2-3
**Difficulty:** Medium

Instead of manually selecting tasks and personas, let users describe what they want to test in plain English:

```
User types: "Test if a senior citizen can find and purchase reading glasses on this site"

Opus generates:
- Tasks: ["Find reading glasses", "Add to cart", "Complete checkout"]
- Personas: [Margaret (72, low tech literacy), Robert (68, moderate tech)]
- Success criteria: "Task complete when confirmation page is reached"
- Device: Desktop (seniors rarely use mobile for e-commerce)
- Estimated duration: 4 minutes
```

**Implementation:**

```python
# backend/app/core/test_planner.py (NEW)

class TestPlanner:
    """Natural language → study configuration via Opus."""

    async def plan_study(self, description: str, url: str) -> StudyPlan:
        """
        Given a natural language test description, generate:
        - Optimal task list
        - Recommended personas (from templates or custom)
        - Success criteria per task
        - Device recommendation
        - Estimated duration and cost
        """
```

**Frontend:**
- Add to study setup wizard as "Quick Start" option
- Single text area: "Describe what you want to test..."
- "Generate Plan" button → shows proposed tasks + personas
- User can accept or modify before running
- Reduces setup from 4 wizard steps to 1 text input

**Why it matters:** This is the "make hard things effortless" promise of Problem Statement 1. It also showcases Opus's ability to translate vague human intent into structured test plans.

---

#### Feature 7: GitHub/Linear Issue Integration
**Criterion impact:** Impact (+4), Demo (+2)
**Engineers:** 1
**Timeline:** Week 3
**Difficulty:** Easy-Medium

When Mirror finds UX issues, automatically create GitHub Issues or Linear tickets. Close the loop from detection to developer action.

**Implementation:**

```python
# backend/app/integrations/github.py (NEW)

class GitHubIntegration:
    async def create_issue(self, repo: str, mirror_issue: Issue, fix: FixSuggestion) -> str:
        """Create a GitHub issue from a Mirror UX finding."""
        title = f"[UX] {issue.severity.upper()}: {issue.description[:80]}"
        body = f"""
## UX Issue Detected by Mirror

**Severity:** {issue.severity}
**Page:** {issue.page_url}
**Element:** {issue.element}
**Heuristic:** {issue.heuristic}
**WCAG:** {issue.wcag_criterion}

### Description
{issue.description}

### Recommendation
{issue.recommendation}

### Suggested Fix
```{fix.fix_language}
{fix.fix_code}
```

### Evidence
- Detected by {len(issue.personas_affected)} of {total_personas} test personas
- Priority score: {issue.priority_score}
- First seen: {issue.first_seen}

---
*Auto-generated by [Mirror](https://mirror.dev) AI Usability Testing*
"""
        return await self._gh_client.create_issue(repo, title, body, labels=["ux", issue.severity])
```

**Frontend:**
- Settings page or per-study config: Connect GitHub repo (OAuth or PAT)
- On results page: "Export to GitHub" button per issue or bulk export
- Badge showing "3 issues exported to github.com/org/repo"

**Why it matters:** This makes Mirror a tool that fits into developer workflows, not a standalone silo. Judges evaluating "could this actually become something people use" will see the integration story.

---

#### Feature 8: Interactive Report Dashboard
**Criterion impact:** Demo (+5), Depth (+2)
**Engineers:** 1-2
**Timeline:** Week 2-3
**Difficulty:** Medium

Replace the current static report preview with an interactive web dashboard that's shareable via URL. This becomes the centerpiece of the demo.

**What it shows:**
- Hero section: UX score (animated counter from 0 to N), letter grade, trend arrow
- Issue severity donut chart (critical/major/minor/enhancement)
- Persona comparison radar chart (each persona's experience on 5 dimensions)
- Emotional journey line chart (all personas overlaid, x-axis = steps, y-axis = emotional valence)
- Interactive issue map: click an issue → see the screenshot where it was found → see the fix → see the fixed version (connects to Fix It Live)
- Scroll-driven narrative: as user scrolls, the report tells the story of the test
- Shareable: `/study/{id}/dashboard` accessible without auth (public share link with token)

**Why it matters for demo:** Instead of showing a PDF, you show a living, interactive dashboard with animations and drill-downs. This is 10x more impressive on video than a static document.

---

### P2 — Nice to Have (Polish & Depth)

---

#### Feature 9: Voice Narration for Session Replay
**Criterion impact:** Demo (+3)
**Engineers:** 1
**Timeline:** Week 3
**Difficulty:** Easy

Use a TTS API (ElevenLabs, OpenAI TTS, or browser SpeechSynthesis) to read the think-aloud narration during session replay. Each persona gets a different voice.

This makes the demo feel like watching a real user test. The judge watches a screencast and HEARS: "I'm looking for the pricing page... I don't see it in the navigation... let me try scrolling down... okay this is frustrating, there's no clear link to pricing."

**Implementation:**
- Frontend-only with Web Speech API (zero backend cost), or
- Backend TTS with OpenAI/ElevenLabs for higher quality audio
- Pre-generate audio per session, cache as MP3
- Sync audio playback to step advancement in replay viewer

---

#### Feature 10: Competitive Benchmark Mode (Full UI)
**Criterion impact:** Impact (+3), Demo (+2)
**Engineers:** 1
**Timeline:** Week 3-4
**Difficulty:** Medium

The backend comparison framework already exists. Build the full UI:
- "New Benchmark" wizard: enter 2-4 competitor URLs + tasks
- Runs same personas against all sites in parallel
- Results: side-by-side score cards, radar chart comparison, "Winner" badge
- "Mirror compared Stripe vs Square vs PayPal checkout flows. Stripe scored 89, Square 72, PayPal 65."

---

#### Feature 11: Regression Alert System
**Criterion impact:** Impact (+2), Depth (+2)
**Engineers:** 1
**Timeline:** Week 3-4
**Difficulty:** Easy

When a scheduled test detects a score drop > 10 points:
- Send Slack/email notification with summary
- Auto-create GitHub issue with regression details
- Dashboard shows alert badge on the URL group
- Timeline view shows "regression detected" marker

Connects to the CI/CD story — Mirror as a continuous quality gate.

---

#### Feature 12: Session Recording Export (MP4/WebM)
**Criterion impact:** Demo (+2)
**Engineers:** 1
**Timeline:** Week 3-4
**Difficulty:** Medium

Upgrade from GIF to proper MP4 video with:
- Think-aloud text overlay (subtitle-style)
- Emotional state indicator in corner
- Action annotations (click highlights, scroll indicators)
- Export as shareable MP4 for stakeholder presentations
- Use FFmpeg (server-side) for encoding

---

## Engineer Assignments

| Engineer | Week 1-2 | Week 3-4 |
|----------|----------|----------|
| **Eng 1** (Senior) | Feature 1a: Extended Thinking for Synthesis | Feature 1c: Multi-Image Flow Analysis |
| **Eng 2** (Senior) | Feature 1b: Tool Use Agentic Navigation | Feature 1b: Polish + edge cases |
| **Eng 3** (Full-stack) | Feature 2: Fix It Live (backend) | Feature 2: Fix It Live (polish + edge cases) |
| **Eng 4** (Frontend) | Feature 2: Fix It Live (frontend slider) | Feature 8: Interactive Report Dashboard |
| **Eng 5** (Full-stack) | Feature 4: Wire FixPanel + Video (3 days) → Feature 5: Accessibility Audit (backend) | Feature 5: Accessibility Audit (frontend + report) |
| **Eng 6** (Backend) | Feature 3: Validation Study (manual runs + data collection) | Feature 7: GitHub/Linear Integration |
| **Eng 7** (Frontend) | Feature 6: Natural Language Test Builder | Feature 10: Competitive Benchmark UI |
| **Eng 8** (Full-stack) | Feature 1d: Switch fix model + auto-trigger fixes in orchestrator | Feature 9: Voice Narration |
| **Eng 9** (Backend) | Feature 11: Regression Alerts | Feature 12: MP4 Video Export |
| **Eng 10** (Lead) | Code review + integration testing + doc writing | Demo video production + submission doc rewrite |

---

## Week-by-Week Milestones

### Week 1: Foundation
- [x] Extended thinking wired into synthesis stage ✅ SHIPPED
- [x] Tool use prototype working in navigation (even if Sonnet, switchable) ✅ SHIPPED
- [x] Fix It Live backend: inject CSS → screenshot → diff pipeline ✅ SHIPPED
- [x] FixPanel integrated into results page ✅ SHIPPED
- [x] Video generation integrated into replay page ✅ SHIPPED
- [x] Fix generation switched to Opus + auto-triggered on study completion ✅ SHIPPED
- [ ] Validation study: first 3 sites tested (REMAINING — Eng 6 manual work)
- [x] Natural language test builder: backend prototype ✅ SHIPPED

### Week 2: Integration
- [x] Extended thinking reasoning traces visible in UI ✅ SHIPPED
- [x] Agentic navigation with tool use running end-to-end ✅ SHIPPED
- [x] Fix It Live: before/after slider working in frontend ✅ SHIPPED
- [x] Multi-image flow analysis: first prototype ✅ SHIPPED
- [x] Accessibility audit: backend pipeline + WCAG schema ✅ SHIPPED
- [ ] Validation study: 10 sites tested, accuracy data compiled (REMAINING)
- [x] Natural language builder: frontend integrated into wizard ✅ SHIPPED

### Week 3: Polish
- [x] All P0 features code-complete and tested ✅ SHIPPED
- [x] Accessibility audit frontend: compliance checklist + visual issue cards ✅ SHIPPED
- [x] Interactive report dashboard: core layout + charts ✅ SHIPPED
- [x] GitHub integration: create issues from Mirror findings ✅ SHIPPED
- [ ] Voice narration: prototype with Web Speech API (REMAINING — Feature 9, Eng 7-10)
- [ ] Competitive benchmark: full UI (REMAINING — Feature 10, Eng 7-10)
- [ ] Regression alerts: Slack/email notifications (REMAINING — Feature 11, Eng 7-10)

### Week 4: Ship
- [ ] All features integration tested end-to-end
- [ ] Performance testing: 5-persona study completes in < 8 minutes
- [ ] Demo video: scripted, recorded, edited (3 minutes SHARP)
- [ ] HACKATHON_SUBMISSION.md rewritten (see structure below)
- [ ] README updated with new features
- [ ] Bug bash: full team runs 20+ studies, files and fixes bugs
- [ ] Final review: team watches demo video cold and rates it

---

## Rewritten Submission Doc Structure

The current doc is 548 lines / ~5,500 words — too long, buries the good parts. New structure:

```
1. THE HOOK (5 lines)
   "Traditional user testing costs $12K and takes 4 weeks.
    Mirror does it for $0.80 in 5 minutes.
    And it writes the code to fix what it finds."

2. WHAT MIRROR DOES (1 paragraph + 1 diagram)
   Core loop only. No feature list.

3. THE OPUS 4.6 SHOWCASE (biggest section — remember, 25% of score)
   - Extended thinking for synthesis (show actual thinking trace)
   - Agentic navigation with tool use (show tool call chain)
   - Multi-image flow analysis (show before/after)
   - Vision accessibility audit (show what automated tools miss)
   - Code fix generation (show actual generated fix)
   Quote actual Opus outputs. Show the prompts. This is where judges
   evaluate "did they go beyond a basic integration?"

4. FIX IT LIVE (the demo moment)
   Before/after screenshot pair. Explain the pipeline.
   "Mirror found this issue, generated this CSS, injected it into
   a live browser, and proved it works."

5. VALIDATION: DOES IT ACTUALLY WORK? (addresses "real-world potential")
   Table: 10 sites tested, X known issues, Y% detection rate
   2-3 specific examples with screenshots

6. ARCHITECTURE (1 diagram, no prose)
   The existing architecture diagram is good. Keep it, shrink everything else.

7. WHAT MAKES MIRROR SPECIAL (10 bullet points — keep from current doc)

8. METRICS (table — keep from current doc, update numbers)
```

Target: 250 lines / ~2,500 words. Half the current length, double the punch.

---

## Demo Video Script (3 minutes)

```
0:00 - 0:15  HOOK
  "What if you could run a user test on any website in 5 minutes,
   with AI personas that think, feel, and struggle like real users —
   and get the code to fix what they find?"

0:15 - 0:30  PASTE URL
  Paste a real URL. Type one sentence: "Test if a first-time user
  can find pricing and sign up."
  → Opus generates tasks + selects personas automatically.
  Click "Run Test."

0:30 - 1:30  WATCH IT LIVE (60 seconds — the longest section)
  Show 3 personas navigating simultaneously.
  Focus on one persona: think-aloud typewriter, emotional state shifting
  from "curious" to "confused" to "frustrated."
  Show the step timeline populating in real-time.
  "Watch — Margaret, our 72-year-old persona, just got stuck on the
  pricing page. She can't find the 'Start Free Trial' button."

1:30 - 2:00  RESULTS
  Score: 64/100. 14 issues found. 3 critical.
  Show Opus's reasoning trace: "I identified this as critical because
  3 of 3 personas failed to complete the signup task, and the root
  cause is the same — the CTA button has insufficient contrast..."
  Show the accessibility audit: "WCAG 2.1 AA: 61% compliant"

2:00 - 2:30  FIX IT LIVE (the applause moment)
  Click on the critical contrast issue.
  Show the generated CSS fix.
  Click "Preview Fix."
  Before/after slider: the button is now visible. Contrast ratio: 7.2:1.
  "Mirror found it, explained why it matters, wrote the fix, and
  proved it works. One click to export to GitHub."

2:30 - 2:50  SCALE
  "Schedule this test to run on every deploy. If the score drops
  below 70, the build fails. We tested 10 real sites and matched
  87% of known usability issues."

2:50 - 3:00  CLOSE
  "Mirror. Watch AI personas break your website — so real users don't have to."
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Agentic navigation is too slow for demo | Keep Sonnet fast path as default, show Opus agentic mode as "Deep Analysis" toggle. Demo can use pre-recorded Opus run |
| Fix injection breaks pages | Graceful fallback: "Preview unavailable for this fix type." CSS fixes have 95%+ success rate — demo only CSS fixes |
| Extended thinking costs too much | Budget cap: 10K thinking tokens. Only on synthesis + complex fixes. Skip for simple issues |
| 10 engineers + merge conflicts | Feature branches with integration testing. Eng 10 (lead) does daily integration checks |
| Validation study finds low accuracy | Be honest about it. "Mirror detected 87% of critical issues but generated 15% false positives." Honesty + improvement plan impresses judges more than fake numbers |
| Demo latency (Opus takes 15s per step) | Pre-record the study execution. Show live results interaction (instant). Only the live navigation needs to be pre-recorded |

---

## What NOT to Build

Resist the temptation to add features that don't move scoring needles:

- **Real-time collaboration** — Cool but doesn't demo well in 3 minutes
- **Slack bot** — Integration story covered by GitHub, Slack adds nothing to demo
- **Mobile app** — Web is enough
- **User auth / team management** — Clerk handles this, don't invest here
- **AI chatbot for results** — Gimmicky, judges will see through it
- **More personas** — 20+ is enough, quality > quantity
- **Internationalization** — English only is fine for hackathon

---

## Definition of Done

The resubmission is ready when:

1. [x] Extended thinking reasoning traces are visible in the UI for at least synthesis stage ✅
2. [x] Agentic navigation with tool use works for at least click + type + verify actions ✅
3. [x] Fix It Live shows before/after for at least CSS fixes ✅
4. [ ] Validation study covers 10+ sites with accuracy metrics (REMAINING)
5. [x] FixPanel and Video generation are wired into the UI ✅
6. [x] Accessibility audit produces a WCAG compliance summary ✅
7. [x] Natural language test builder generates reasonable study configs ✅
8. [x] GitHub integration creates properly formatted issues ✅
9. [ ] Demo video is 3:00 or less, rehearsed, and gets "wow" from cold viewers (REMAINING)
10. [ ] Submission doc is under 300 lines and leads with Opus showcase (REMAINING)
11. [ ] All features tested with 5+ end-to-end study runs (REMAINING)
12. [ ] No regressions in existing features (REMAINING)
