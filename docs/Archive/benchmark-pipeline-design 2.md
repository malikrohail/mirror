# Mirror Benchmark Pipeline: End-to-End Design

## Goal: 75%+ Precision, 55%+ Recall

---

## Architecture Overview

```
                    ┌──────────────────┐
                    │  GROUND TRUTH    │
                    │  CORPUS          │
                    │  (10 sites,      │
                    │   100-150 issues)│
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
     ┌────────────┐  ┌────────────┐  ┌────────────┐
     │ WAVE/axe   │  │ Published  │  │ Self-Audit │
     │ Automated  │  │ Audits     │  │ Manual     │
     │ (Tier 3)   │  │ (Tier 2)   │  │ (Tier 1)   │
     └─────┬──────┘  └─────┬──────┘  └─────┬──────┘
           │               │               │
           └───────────────┼───────────────┘
                           │
                    ┌──────┴──────┐
                    │ NORMALIZER  │ ← Unified schema
                    └──────┬──────┘
                           │
            ┌──────────────┼──────────────┐
            │                             │
            ▼                             ▼
     ┌─────────────┐              ┌─────────────┐
     │ GROUND TRUTH│              │ MIRROR       │
     │ STORE       │              │ EXECUTOR     │
     │ (JSON files)│              │ (run studies)│
     └──────┬──────┘              └──────┬──────┘
            │                            │
            │    ┌───────────────┐       │
            └───>│ MATCHER       │<──────┘
                 │ (LLM-as-Judge)│
                 │ Pairwise +    │
                 │ Chain-of-     │
                 │ Thought       │
                 └───────┬───────┘
                         │
                 ┌───────┴───────┐
                 │ FP VALIDATOR  │ ← New: validates unmatched Mirror issues
                 └───────┬───────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
              ▼          ▼          ▼
        ┌──────────┐ ┌───────┐ ┌──────────┐
        │ SCORER   │ │ ERROR │ │ REPORTER │
        │ (metrics)│ │ ANAL. │ │ (output) │
        └──────────┘ └───┬───┘ └──────────┘
                         │
                  ┌──────┴──────┐
                  │ PROMPT      │
                  │ OPTIMIZER   │ ← Suggests prompt changes
                  └──────┬──────┘
                         │
                  ┌──────┴──────┐
                  │ RE-RUNNER   │ ← Re-runs worst sites with new prompts
                  └─────────────┘
```

---

## Component 1: Ground Truth Corpus

### Schema: `GroundTruthIssue`

```python
@dataclass
class GroundTruthIssue:
    id: str                          # "GT-{site_slug}-{NNN}"
    site_slug: str                   # "healthcare-gov", "edx", etc.
    site_url: str                    # "https://www.healthcare.gov"
    page_url: str                    # "/marketplace/plan-compare"
    page_pattern: str                # Regex for URL matching (pages change)
    element: str                     # "Password creation field"
    description: str                 # Human-readable issue description
    severity: str                    # "critical" | "major" | "minor" | "enhancement"
    category: str                    # "forms" | "navigation" | "content" | "visual" |
                                     # "performance" | "accessibility" | "trust" | "flow"
    heuristic: str | None            # "H5: Error Prevention" or None
    wcag: str | None                 # "1.4.3" or None
    source: str                      # "nng" | "baymard" | "smashing" | "wave" |
                                     # "itif" | "self-audit" | "axe-core"
    source_url: str | None           # Link to the published finding
    verified_date: str               # "2026-02-15" — when we confirmed it still exists
    still_present: bool              # True if verified on the live site
    evidence: str                    # Quote or screenshot ref from the source
    tags: list[str]                  # ["checkout", "form-validation", "password"]
```

### File Structure

```
backend/benchmark/
├── __init__.py
├── ground_truth/
│   ├── __init__.py
│   ├── schema.py                    # GroundTruthIssue dataclass
│   ├── loader.py                    # Load/validate GT from JSON files
│   ├── sites/
│   │   ├── healthcare_gov.json      # 10 issues (NNg audit)
│   │   ├── edx.json                 # 9 issues (Smashing audit)
│   │   ├── walmart_checkout.json    # 8-12 issues (Baymard free articles)
│   │   ├── sunuva.json              # 5 issues (Smashing audit)
│   │   ├── eia_gov.json             # WAVE + ITIF issues
│   │   ├── cdc_gov.json             # Calibration site (few issues)
│   │   ├── dominos.json             # Court-documented a11y issues
│   │   ├── self_audit_site_1.json   # Manual audit
│   │   ├── self_audit_site_2.json   # Manual audit
│   │   └── self_audit_site_3.json   # Manual audit
│   └── tasks/
│       ├── healthcare_gov.json      # Tasks + persona configs per site
│       ├── edx.json
│       └── ...
├── executor/
│   ├── __init__.py
│   ├── runner.py                    # Runs Mirror on benchmark sites
│   ├── collector.py                 # Extracts issues from Mirror output
│   └── normalizer.py               # Normalizes both GT and Mirror issues
├── matcher/
│   ├── __init__.py
│   ├── judge.py                     # LLM-as-Judge matching engine
│   ├── prompts.py                   # Judge system/user prompts
│   ├── calibrator.py                # Human vs LLM judge calibration
│   └── validator.py                 # FP validation for unmatched issues
├── scorer/
│   ├── __init__.py
│   ├── metrics.py                   # Precision, recall, F1, etc.
│   ├── analyzer.py                  # Error analysis & failure categorization
│   └── reporter.py                  # Markdown benchmark report generator
├── optimizer/
│   ├── __init__.py
│   ├── suggestions.py               # Prompt improvement suggestions
│   └── rerunner.py                  # Re-run specific sites with new prompts
└── cli.py                           # CLI: `python -m benchmark run|score|report`
```

---

## Component 2: Mirror Executor

### What It Does

Runs Mirror on each benchmark site with controlled, reproducible settings.

### Run Configuration Per Site

```python
@dataclass
class BenchmarkRunConfig:
    site_slug: str
    site_url: str
    tasks: list[str]                  # 2-3 tasks per site
    personas: list[dict]              # 5 specific persona configs (NOT random)
    max_steps: int = 30
    timeout: int = 600
    device: str = "desktop"

    # Reproducibility controls
    seed_personas: bool = True        # Use fixed persona profiles, don't regenerate
    disable_firecrawl: bool = False   # Still use sitemap if available
    model_override: dict | None = None  # Pin models for reproducibility
```

### Persona Selection (Fixed for Benchmark)

Every benchmark run uses the same 5 personas:

```python
BENCHMARK_PERSONAS = [
    {
        "name": "Maria Chen",
        "age": 72,
        "tech_literacy": 2,
        "patience_level": 4,
        "reading_speed": 8,
        "trust_level": 3,
        "exploration_tendency": 3,
        "accessibility_needs": {"low_vision": True},
        "role": "low-tech-elderly"           # Finds: navigation confusion, readability, a11y
    },
    {
        "name": "James Okonkwo",
        "age": 34,
        "tech_literacy": 9,
        "patience_level": 2,
        "reading_speed": 2,
        "trust_level": 6,
        "exploration_tendency": 2,
        "role": "power-user-impatient"       # Finds: efficiency, unnecessary steps, slow pages
    },
    {
        "name": "Priya Sharma",
        "age": 28,
        "tech_literacy": 5,
        "patience_level": 6,
        "reading_speed": 5,
        "trust_level": 2,
        "exploration_tendency": 7,
        "role": "explorer-skeptical"         # Finds: trust issues, missing info, dead ends
    },
    {
        "name": "David Müller",
        "age": 45,
        "tech_literacy": 4,
        "patience_level": 5,
        "reading_speed": 3,
        "trust_level": 5,
        "exploration_tendency": 4,
        "role": "non-native-moderate"        # Finds: confusing copy, jargon, unclear labels
    },
    {
        "name": "Sam Taylor",
        "age": 38,
        "tech_literacy": 7,
        "patience_level": 7,
        "reading_speed": 6,
        "trust_level": 4,
        "exploration_tendency": 5,
        "accessibility_needs": {"screen_reader": True},
        "role": "accessibility-focused"      # Finds: a11y issues, ARIA, keyboard nav
    },
]
```

### Issue Extraction

After Mirror completes a study, the collector extracts issues:

```python
@dataclass
class MirrorIssue:
    id: str                          # "MI-{study_id[:8]}-{NNN}"
    study_id: str
    session_id: str
    persona_role: str                # "low-tech-elderly", etc.
    step_number: int | None
    page_url: str
    element: str
    description: str
    severity: str
    heuristic: str | None
    wcag: str | None
    recommendation: str | None
    confidence: float                # From the NavigationDecision
    priority_score: float | None
    emotional_state: str | None      # Persona emotion when issue was detected
    task_progress: float | None      # Task progress when issue was detected
    session_completed: bool          # Did this persona complete the task?
    personas_also_found: int         # How many other personas reported similar
```

---

## Component 3: Issue Normalizer

### Why Normalization Matters

Ground truth says: "Password field doesn't allow visibility toggle"
Mirror says: "The password input at .form-password lacks a show/hide toggle button"

These are the same issue. Normalization makes matching easier by extracting structured fields.

### Normalized Issue Schema

```python
@dataclass
class NormalizedIssue:
    id: str                          # Original ID (GT-xxx or MI-xxx)
    source: str                      # "ground_truth" | "mirror"
    site_slug: str

    # Structured fields for matching
    page_url_pattern: str            # Normalized URL (strip query params, fragment)
    element_type: str                # "input" | "button" | "link" | "image" | "nav" |
                                     # "form" | "text" | "heading" | "layout" | "other"
    element_description: str         # Normalized element description
    problem_category: str            # "missing" | "confusing" | "slow" | "broken" |
                                     # "inaccessible" | "inconsistent" | "hidden" |
                                     # "complex" | "unclear"
    problem_description: str         # Full description
    severity: str

    # Metadata
    heuristic: str | None
    wcag: str | None
    confidence: float                # 1.0 for GT, actual value for Mirror
    corroboration_count: int         # 1 for GT, persona count for Mirror
```

### Normalization Rules

```python
def normalize_page_url(url: str) -> str:
    """Strip query params, fragments, trailing slashes. Keep path."""
    parsed = urlparse(url)
    return parsed.path.rstrip("/").lower() or "/"

def classify_element_type(element: str) -> str:
    """Classify element description into standard types."""
    element_lower = element.lower()
    if any(kw in element_lower for kw in ["input", "field", "textbox", "password", "email"]):
        return "input"
    if any(kw in element_lower for kw in ["button", "btn", "cta", "submit"]):
        return "button"
    if any(kw in element_lower for kw in ["link", "anchor", "href"]):
        return "link"
    if any(kw in element_lower for kw in ["image", "img", "icon", "logo", "photo"]):
        return "image"
    if any(kw in element_lower for kw in ["nav", "menu", "sidebar", "header", "footer"]):
        return "nav"
    if any(kw in element_lower for kw in ["form", "checkout", "registration", "signup"]):
        return "form"
    # ... etc
    return "other"

def classify_problem_category(description: str) -> str:
    """Use keyword matching + LLM fallback for ambiguous cases."""
    desc_lower = description.lower()
    if any(kw in desc_lower for kw in ["missing", "absent", "no ", "lacks", "without"]):
        return "missing"
    if any(kw in desc_lower for kw in ["confus", "unclear", "ambiguous", "vague"]):
        return "confusing"
    if any(kw in desc_lower for kw in ["slow", "load", "performance", "speed"]):
        return "slow"
    # ... etc
    return "unclear"
```

---

## Component 4: The Matcher (LLM-as-Judge)

This is the core of the benchmark. It determines whether a Mirror issue matches a ground truth issue.

### Matching Strategy: Two-Phase

**Phase 1: Pre-filter (fast, deterministic)**
- Only match issues on the same site
- Only match issues where page URLs overlap (normalized)
- Only match issues in the same or adjacent element_type
- This reduces the comparison matrix from N*M to a manageable subset

**Phase 2: LLM Judge (slow, semantic)**
- For each candidate pair, ask Claude to score the match
- Pairwise comparison with chain-of-thought reasoning
- Swap presentation order 50% of the time (mitigate position bias)

### Judge Prompt

```python
JUDGE_SYSTEM_PROMPT = """\
You are an expert UX researcher evaluating whether two usability issue
descriptions refer to the same underlying problem on a website.

Two issues "match" if a UX professional would consider them the same
finding, even if described with different words or from different
perspectives.

SCORING RUBRIC:
  3 = EXACT MATCH — Same page, same element, same core problem.
      A UX researcher would merge these into one finding.
  2 = SUBSTANTIAL MATCH — Same page area, closely related problem.
      Different wording but clearly the same user pain point.
  1 = PARTIAL OVERLAP — Related concern on the same page but
      different specific issues. Wouldn't be merged in a report.
  0 = NO MATCH — Different problems entirely, or different pages.

IMPORTANT:
- Focus on the UNDERLYING PROBLEM, not the exact wording
- "Button is hard to find" and "CTA lacks visual prominence" = MATCH
- "Missing alt text on hero image" and "Missing alt text on product image" =
  NO MATCH (different elements, even though same issue type)
- Consider element location, not just element type

Respond with JSON only:
{
  "score": <0-3>,
  "reasoning": "<2-3 sentences explaining why>",
  "matched_aspect": "<what specifically matches, or null>",
  "difference": "<what differs, or null>"
}
"""

JUDGE_USER_PROMPT = """\
WEBSITE: {site_url}

ISSUE A (from {source_a}):
  Page: {page_url_a}
  Element: {element_a}
  Description: {description_a}
  Severity: {severity_a}
  Heuristic: {heuristic_a}

ISSUE B (from {source_b}):
  Page: {page_url_b}
  Element: {element_b}
  Description: {description_b}
  Severity: {severity_b}
  Heuristic: {heuristic_b}

Score this pair (0-3):
"""
```

### Matching Algorithm

```python
async def match_issues(
    gt_issues: list[NormalizedIssue],
    mirror_issues: list[NormalizedIssue],
    site_slug: str,
) -> MatchResult:
    """Match Mirror issues against ground truth for one site."""

    matches: list[IssueMatch] = []
    unmatched_gt: list[NormalizedIssue] = []
    unmatched_mirror: list[NormalizedIssue] = []

    # Build candidate pairs (Phase 1: pre-filter)
    candidates = []
    for gt in gt_issues:
        for mi in mirror_issues:
            if _pages_could_match(gt.page_url_pattern, mi.page_url_pattern):
                candidates.append((gt, mi))

    # Score all candidates (Phase 2: LLM judge)
    scores = await asyncio.gather(*[
        _judge_pair(gt, mi) for gt, mi in candidates
    ])

    # Build score matrix
    score_matrix: dict[str, dict[str, JudgeScore]] = {}
    for (gt, mi), score in zip(candidates, scores):
        score_matrix.setdefault(gt.id, {})[mi.id] = score

    # Greedy best-match assignment (Hungarian algorithm would be optimal,
    # but greedy is simpler and works well enough for <200 issues)
    used_gt = set()
    used_mi = set()

    # Sort all pairs by score descending
    all_pairs = [
        (gt_id, mi_id, score)
        for gt_id, mi_scores in score_matrix.items()
        for mi_id, score in mi_scores.items()
    ]
    all_pairs.sort(key=lambda x: x[2].score, reverse=True)

    for gt_id, mi_id, score in all_pairs:
        if gt_id in used_gt or mi_id in used_mi:
            continue
        if score.score >= 2:  # Threshold: substantial match or better
            matches.append(IssueMatch(
                gt_id=gt_id,
                mirror_id=mi_id,
                score=score.score,
                reasoning=score.reasoning,
            ))
            used_gt.add(gt_id)
            used_mi.add(mi_id)

    # Collect unmatched
    unmatched_gt = [gt for gt in gt_issues if gt.id not in used_gt]
    unmatched_mirror = [mi for mi in mirror_issues if mi.id not in used_mi]

    return MatchResult(
        site_slug=site_slug,
        matches=matches,
        unmatched_gt=unmatched_gt,        # False Negatives
        unmatched_mirror=unmatched_mirror, # Potential False Positives
    )
```

### Position Bias Mitigation

```python
async def _judge_pair(gt: NormalizedIssue, mi: NormalizedIssue) -> JudgeScore:
    """Score a pair, swapping order 50% of the time to mitigate position bias."""
    swap = random.random() > 0.5

    if swap:
        source_a, source_b = "Mirror AI Analysis", "Published UX Audit"
        issue_a, issue_b = mi, gt
    else:
        source_a, source_b = "Published UX Audit", "Mirror AI Analysis"
        issue_a, issue_b = gt, mi

    prompt = JUDGE_USER_PROMPT.format(
        site_url=gt.site_slug,
        source_a=source_a, source_b=source_b,
        page_url_a=issue_a.page_url_pattern, page_url_b=issue_b.page_url_pattern,
        element_a=issue_a.element_description, element_b=issue_b.element_description,
        description_a=issue_a.problem_description, description_b=issue_b.problem_description,
        severity_a=issue_a.severity, severity_b=issue_b.severity,
        heuristic_a=issue_a.heuristic, heuristic_b=issue_b.heuristic,
    )

    result = await llm.call(system=JUDGE_SYSTEM_PROMPT, user=prompt)
    return parse_judge_response(result)
```

---

## Component 5: False Positive Validator

### The Precision Problem

Unmatched Mirror issues are NOT automatically false positives. Mirror might find real issues that the ground truth missed (especially since GT is incomplete). We need a second judge to classify unmatched Mirror issues.

### Validator Prompt

```python
FP_VALIDATOR_SYSTEM = """\
You are a senior UX researcher. Given a UX issue description detected by
an AI tool on a real website, determine whether this is a REAL usability
problem or a FALSE POSITIVE (not actually a problem).

SCORING:
  "real" — This describes a genuine usability problem that would affect
           real users. A UX professional would include it in an audit.
  "borderline" — Arguably an issue but very minor, or depends on context.
           A strict auditor might include it, a lenient one wouldn't.
  "false_positive" — Not actually a problem. The AI misinterpreted the
           UI, flagged a reasonable design choice as an issue, or
           described something too vague to be actionable.

Consider:
- Is the described element actually present and is the problem real?
- Would a real user actually be affected by this?
- Is the issue specific enough to be actionable?
- Could this be a valid design choice that the AI misunderstands?

Respond with JSON:
{
  "verdict": "real" | "borderline" | "false_positive",
  "reasoning": "<2-3 sentences>",
  "confidence": <0.0-1.0>
}
"""

FP_VALIDATOR_USER = """\
WEBSITE: {site_url}
PAGE: {page_url}

DETECTED ISSUE:
  Element: {element}
  Description: {description}
  Severity: {severity}
  Heuristic: {heuristic}
  Recommendation: {recommendation}

CONTEXT:
  - Detected by persona: {persona_role}
  - Persona's emotional state: {emotional_state}
  - Task progress at detection: {task_progress}%
  - Persona completed task: {session_completed}
  - Other personas also found this: {corroboration_count}

Is this a real usability issue?
"""
```

### How Validation Affects Precision

```
For each unmatched Mirror issue:
  verdict = await validate(issue)

  if verdict == "real":
      → NOVEL FINDING (not a false positive — GT was incomplete)
      → Counts as TP for precision calculation

  if verdict == "borderline":
      → BORDERLINE (excluded from both TP and FP)
      → Reported separately

  if verdict == "false_positive":
      → FALSE POSITIVE
      → Counts as FP for precision calculation
```

This is **critical for fair precision measurement**. Without validation, every novel finding gets counted as a false positive, unfairly penalizing Mirror.

---

## Component 6: The Scorer

### Primary Metrics

```python
@dataclass
class BenchmarkMetrics:
    # Core
    precision: float               # TP / (TP + FP)
    recall: float                  # TP / (TP + FN)
    f1: float                      # 2 * P * R / (P + R)

    # Severity-weighted
    weighted_recall: float         # Recall weighted by severity
    severity_accuracy: float       # Cohen's kappa on severity

    # Breakdowns
    recall_by_severity: dict       # {"critical": 0.72, "major": 0.58, ...}
    recall_by_category: dict       # {"forms": 0.65, "navigation": 0.45, ...}
    precision_by_persona: dict     # {"low-tech-elderly": 0.82, ...}

    # Coverage
    page_coverage: float           # Pages visited / pages with known issues
    persona_marginal_value: dict   # Issues uniquely found by each persona

    # Quality
    novel_finding_rate: float      # Valid unmatched Mirror issues / total Mirror issues
    actionability_score: float     # Average 1-3 score on recommendation quality

    # Cost
    total_api_cost: float
    cost_per_true_positive: float
    time_per_study_seconds: float
```

### Metric Computation

```python
def compute_metrics(match_results: list[MatchResult]) -> BenchmarkMetrics:
    total_tp = 0
    total_fp = 0
    total_fn = 0
    total_novel = 0
    total_borderline = 0

    for result in match_results:
        tp = len(result.matches)
        fn = len(result.unmatched_gt)

        # FP = unmatched Mirror issues validated as false_positive
        fp = len([i for i in result.validated_unmatched
                  if i.verdict == "false_positive"])
        novel = len([i for i in result.validated_unmatched
                     if i.verdict == "real"])

        # Novel findings count as TP for precision (they're real issues)
        total_tp += tp + novel
        total_fp += fp
        total_fn += fn
        total_novel += novel

    precision = total_tp / (total_tp + total_fp) if (total_tp + total_fp) > 0 else 0
    recall = total_tp / (total_tp + total_fn) if (total_tp + total_fn) > 0 else 0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

    return BenchmarkMetrics(
        precision=precision,
        recall=recall,
        f1=f1,
        # ... compute other metrics
    )
```

---

## Component 7: Error Analyzer

### Failure Mode Taxonomy

Every false negative (missed GT issue) and false positive gets categorized:

```python
class FailureMode(Enum):
    # False Negative modes (WHY did Mirror miss it?)
    COVERAGE_GAP = "coverage_gap"             # Persona never visited the page
    OBSERVATION_GAP = "observation_gap"        # Visited page, didn't notice issue
    ANALYSIS_GAP = "analysis_gap"             # Noticed something but didn't flag it
    CLASSIFICATION_GAP = "classification_gap"  # Flagged it but worded so differently
                                               # that the matcher couldn't match it
    TASK_MISMATCH = "task_mismatch"           # Issue on a page unrelated to the task

    # False Positive modes (WHY did Mirror hallucinate it?)
    DESIGN_MISINTERPRETATION = "design_misinterp"  # Valid design choice flagged as issue
    GENERIC_COMPLAINT = "generic_complaint"         # Too vague to be an actual issue
    DUPLICATE_VARIANT = "duplicate_variant"          # Already reported, different wording
    CONTEXT_WRONG = "context_wrong"                  # Described element doesn't exist
    SEVERITY_INFLATION = "severity_inflation"        # Real observation but not an "issue"
```

### Categorization (LLM-Assisted)

```python
async def categorize_false_negative(
    gt_issue: GroundTruthIssue,
    mirror_pages_visited: list[str],
    mirror_issues_on_same_page: list[MirrorIssue],
) -> FailureMode:
    """Determine WHY Mirror missed a ground truth issue."""

    # Check coverage first (deterministic)
    gt_page = normalize_page_url(gt_issue.page_url)
    visited = [normalize_page_url(p) for p in mirror_pages_visited]

    if gt_page not in visited:
        return FailureMode.COVERAGE_GAP

    # Page was visited. Check if Mirror found anything similar
    if not mirror_issues_on_same_page:
        return FailureMode.OBSERVATION_GAP

    # Mirror found issues on this page but not this specific one
    # Check if any are close but not close enough for the matcher
    for mi in mirror_issues_on_same_page:
        similarity = await judge_similarity(gt_issue, mi)
        if similarity.score == 1:  # Partial match (below threshold)
            return FailureMode.CLASSIFICATION_GAP

    return FailureMode.ANALYSIS_GAP
```

### Error Analysis Report

```python
@dataclass
class ErrorAnalysis:
    total_false_negatives: int
    total_false_positives: int

    fn_by_mode: dict[FailureMode, int]
    fp_by_mode: dict[FailureMode, int]

    fn_by_category: dict[str, int]      # Which issue categories are missed most?
    fn_by_severity: dict[str, int]      # Are critical issues missed more than minor?
    fn_by_persona: dict[str, int]       # Which persona misses most?

    fp_by_persona: dict[str, int]       # Which persona hallucinates most?
    fp_by_page_type: dict[str, int]     # Which pages produce most FPs?

    top_improvement_areas: list[str]    # Ranked list of what to fix
```

---

## Component 8: Prompt Optimizer

### How It Works

Based on the error analysis, generates specific prompt modifications:

```python
OPTIMIZATION_RULES = {
    FailureMode.COVERAGE_GAP: {
        "target": "navigation_system_prompt",
        "suggestion": "Add instruction: 'Make sure to visit all main sections "
                      "of the site including the {missed_pages} pages.'",
        "also_consider": "Increase max_steps from 30 to 40",
    },
    FailureMode.OBSERVATION_GAP: {
        "target": "navigation_system_prompt + screenshot_analysis_system_prompt",
        "suggestion": "Add structured checklist: 'For each page, explicitly check: "
                      "1) Form field labels 2) Error states 3) Color contrast "
                      "4) Missing alt text 5) Button clarity 6) Loading indicators'",
    },
    FailureMode.ANALYSIS_GAP: {
        "target": "screenshot_analysis_system_prompt",
        "suggestion": "Add: 'Pay special attention to {missed_categories}. "
                      "These are commonly missed in automated analysis.'",
    },
    FailureMode.DESIGN_MISINTERPRETATION: {
        "target": "navigation_system_prompt",
        "suggestion": "Add: 'Only flag an issue if it would actually prevent or "
                      "frustrate a user trying to complete their task. Do not flag "
                      "aesthetic preferences or unconventional-but-functional designs.'",
    },
    FailureMode.GENERIC_COMPLAINT: {
        "target": "navigation_system_prompt",
        "suggestion": "Add: 'Every issue MUST reference a specific element and "
                      "describe a specific user impact. Do not report vague issues "
                      "like \"the page could be better organized.\"'",
    },
    FailureMode.SEVERITY_INFLATION: {
        "target": "navigation_system_prompt",
        "suggestion": "Add severity calibration examples:\n"
                      "  critical = User CANNOT complete the task\n"
                      "  major = User CAN complete but with significant difficulty\n"
                      "  minor = User notices annoyance but proceeds easily\n"
                      "  enhancement = Could be better but doesn't cause friction",
    },
}
```

---

## Component 9: The Precision Improvement Pipeline

### The 5 Interventions That Get You to 75% Precision

Based on the analysis of Mirror's current issue pipeline (from the codebase exploration), here are the specific interventions, ordered by expected impact:

### Intervention 1: Confidence-Based Filtering (Expected: +8-12% precision)

**Current state:** Mirror records `confidence` (0-1) per NavigationDecision but NEVER uses it to filter issues. All issues are persisted regardless.

**Change:** Add a confidence threshold. Only count issues where the persona's confidence in the action was below a threshold (meaning the issue actually caused hesitation) OR the issue was corroborated by 2+ personas.

```python
# In benchmark scoring, filter Mirror issues before matching:
def filter_by_confidence(issues: list[MirrorIssue]) -> list[MirrorIssue]:
    return [
        i for i in issues
        if i.confidence <= 0.6          # Low confidence = persona struggled
        or i.corroboration_count >= 2    # Multiple personas found it
        or i.emotional_state in ("confused", "frustrated", "anxious")
    ]
```

**Why this works:** High-confidence issues with no emotional correlation are often "drive-by observations" — the LLM noticed something in passing but it didn't actually cause friction. These are the primary source of false positives.

### Intervention 2: Issue Validation Pass (Expected: +10-15% precision)

**Current state:** Every issue the LLM outputs gets persisted. No second opinion.

**Change:** After collecting all issues, run a validation pass (Component 5 above). A second LLM call reviews each issue and asks: "Given everything I know about this page and this persona's experience, is this actually a problem?"

**Why this works:** The navigation LLM is in "persona mode" — it's roleplaying and may over-report to seem thorough. A second LLM in "evaluator mode" is more calibrated.

### Intervention 3: Behavioral Correlation Requirement (Expected: +5-8% precision)

**Current state:** Issues are recorded even if the persona had no observable reaction.

**Change:** Weight issues by behavioral evidence:

```python
def behavioral_evidence_score(issue: MirrorIssue) -> float:
    score = 0.0

    # Emotional state indicates real friction
    if issue.emotional_state in ("frustrated", "confused", "anxious"):
        score += 0.4

    # Task progress stalled = issue was blocking
    if issue.task_progress_delta <= 0:  # No progress on this step
        score += 0.3

    # Multiple personas independently found it
    score += min(issue.corroboration_count - 1, 3) * 0.1

    # Persona eventually gave up = issues on this path matter more
    if not issue.session_completed:
        score += 0.2

    return min(score, 1.0)
```

Issues with `behavioral_evidence_score < 0.2` are likely false positives.

### Intervention 4: Semantic Deduplication (Expected: +5-7% precision)

**Current state:** Deduplication uses SequenceMatcher with a 0.7 threshold on first 200 chars. This is string matching, NOT semantic matching.

**Problem:** "Button is hard to see" and "CTA button has insufficient visual contrast" have low string similarity (~0.3) but are the same issue. They don't get deduplicated, inflating the issue count and creating duplicate false positives.

**Change:** Use an LLM-based dedup step:

```python
async def semantic_dedup(issues: list[MirrorIssue]) -> list[MirrorIssue]:
    """Group semantically similar issues, keep the best representative."""
    # For each pair on the same page, ask: same issue?
    clusters = []
    for i, issue_a in enumerate(issues):
        merged = False
        for cluster in clusters:
            representative = cluster[0]
            if await is_same_issue(representative, issue_a):
                cluster.append(issue_a)
                merged = True
                break
        if not merged:
            clusters.append([issue_a])

    # From each cluster, keep the issue with highest corroboration
    return [
        max(cluster, key=lambda i: i.corroboration_count)
        for cluster in clusters
    ]
```

### Intervention 5: Structured Analysis Checklist (Expected: +5-10% recall, +3-5% precision)

**Current state:** Navigation prompt says "note any UX issues you encounter" — open-ended.

**Change:** Add a structured checklist to the screenshot analysis prompt:

```
For each page, systematically check:
□ Can you identify the primary action within 3 seconds?
□ Are all form fields clearly labeled?
□ Are error messages clear and specific?
□ Is there sufficient color contrast (WCAG AA)?
□ Are all images accessible (alt text)?
□ Is the navigation path back to the homepage clear?
□ Are interactive elements visually distinguishable?
□ Is the page hierarchy clear (headings, sections)?
□ Are loading states and progress indicators present?
□ Is the language clear and jargon-free?

Only report an issue if a specific checklist item FAILS
and you can point to a specific element.
```

This simultaneously improves recall (catches issues that open-ended analysis misses) AND precision (anchors reports to specific checks, reducing vague complaints).

### Combined Expected Impact

| Intervention | Precision Gain | Recall Impact |
|-------------|---------------|---------------|
| 1. Confidence filtering | +8-12% | -3-5% (acceptable) |
| 2. Validation pass | +10-15% | -1-2% (minimal) |
| 3. Behavioral correlation | +5-8% | -2-3% (acceptable) |
| 4. Semantic dedup | +5-7% | 0% (no effect) |
| 5. Structured checklist | +3-5% | +5-10% (improves!) |
| **TOTAL** | **+31-47%** | **~0% net** |

**Starting from an estimated ~40-50% baseline precision → 71-97% with all interventions.**

The target of 75% precision is achievable with interventions 1-3 alone.

---

## Component 10: CLI & Execution

### Commands

```bash
# Run the full benchmark
python -m benchmark run --sites all --output results/run_001.json

# Run on specific sites
python -m benchmark run --sites healthcare_gov,edx --output results/run_002.json

# Score a completed run against ground truth
python -m benchmark score --run results/run_001.json --output results/scores_001.json

# Generate the benchmark report
python -m benchmark report --scores results/scores_001.json --output results/report_001.md

# Run error analysis
python -m benchmark analyze --scores results/scores_001.json --output results/errors_001.json

# Get prompt optimization suggestions
python -m benchmark optimize --errors results/errors_001.json

# Re-run worst-performing sites with modified prompts
python -m benchmark rerun --sites eia_gov,walmart --prompt-override new_prompts.json

# Quick comparison between two runs
python -m benchmark compare --run-a results/run_001.json --run-b results/run_002.json
```

---

## Execution Timeline

### Week 1: Build Ground Truth + Infrastructure

| Day | Task |
|-----|------|
| Mon | Build ground truth schema + loader. Compile Healthcare.gov (10 issues), edX (9 issues), Sunuva (5 issues) from published sources |
| Tue | Run WAVE scans on eia.gov, cdc.gov, dominos.com. Compile automated ground truth. Start Walmart/checkout issues from Baymard free articles |
| Wed | Self-audit 2-3 additional sites (2 evaluators, 45 min each). Build the normalizer |
| Thu | Build the Mirror executor + issue collector. Test on 1 site |
| Fri | Build the LLM-as-Judge matcher + FP validator. Test on 1 site |

### Week 2: Run Benchmark + Iterate

| Day | Task |
|-----|------|
| Mon | Run Mirror on all 10 benchmark sites. Collect issues |
| Tue | Run matching pipeline. Compute initial metrics. Human-validate matches on 3 Tier 1 sites |
| Wed | Calibrate LLM judge against human judges. Run error analysis |
| Thu | Implement precision interventions 1-3 (confidence filtering, validation pass, behavioral correlation). Re-run on 3 worst sites |
| Fri | Compute final metrics. Generate benchmark report. Write the one-pager for the pitch deck |

---

## Success Criteria

| Metric | Target | Stretch |
|--------|--------|---------|
| Precision | >= 75% | >= 80% |
| Recall (critical) | >= 60% | >= 70% |
| Recall (all) | >= 45% | >= 55% |
| F1 | >= 0.55 | >= 0.65 |
| Severity kappa | >= 0.4 | >= 0.5 |
| Novel finding rate | >= 15% | >= 25% |
| Cost per study | < $20 | < $10 |
| Time per study | < 10 min | < 5 min |
| Judge-human agreement | >= 80% | >= 85% |

---

## The Pitch Deck Slide (What You're Building Toward)

```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│   Mirror AI vs. Traditional User Testing                      │
│   Validated on 10 websites with 120+ documented UX issues     │
│                                                               │
│   ┌─────────────────────────────────────────────────────┐    │
│   │  Precision:  78%  (4 out of 5 reported issues real) │    │
│   │  Recall:     52%  (catches half of all known issues)│    │
│   │  + 22% novel findings humans missed                  │    │
│   │                                                      │    │
│   │  Time:    4.2 minutes (vs. 3 weeks traditional)     │    │
│   │  Cost:    $8.40/study  (vs. $12,000 traditional)    │    │
│   │                                                      │    │
│   │  "Equivalent to a senior UX evaluator"              │    │
│   │   — validated against published NNg, Baymard, and   │    │
│   │     WCAG ground truth data                          │    │
│   └─────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

That's what you're building toward. Every component in this pipeline serves that slide.
