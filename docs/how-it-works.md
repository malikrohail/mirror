# How Mirror Works

Mirror is an AI-powered usability testing platform. You provide a URL and a set of tasks, and Mirror sends AI personas to navigate your live site in real browsers. Each persona thinks aloud, flags UX issues, and scores your experience. You get a full insight report in minutes instead of weeks.

---

## The 4-Step Flow

### 1. Paste Your URL

Enter the URL of the site or page you want to test. Mirror will use this as the starting point for every persona session.

### 2. Define Tasks

Describe what you want tested. Tasks are written in plain language, the same way you would brief a real participant.

Examples:
- "Find the pricing page and compare the Pro and Enterprise plans."
- "Add a blue t-shirt in size Medium to your cart and begin checkout."
- "Sign up for a free trial using an email address."

You can define one task or several. Each persona will attempt every task independently.

### 3. Pick Personas

Choose from a library of 20+ pre-built personas, or describe a custom one in your own words and let Mirror generate it.

Pre-built personas cover a range of demographics, technical skill levels, accessibility needs, and behavioral tendencies. Each persona has a distinct profile that shapes how it navigates: a first-time smartphone user will behave very differently from a power user with a screen reader.

### 4. Get Results

Once the study finishes, you receive:

- **UX scores** for each persona and an overall score for the site.
- **Issues list** with severity ratings (critical, major, minor, enhancement) and recommendations.
- **Session replays** showing every step each persona took, with think-aloud narration.
- **Heatmaps** showing where personas clicked and scrolled on each page.
- **Downloadable reports** in PDF and Markdown formats.

---

## What Happens Under the Hood

When you launch a study, Mirror runs through three phases automatically.

### Navigation

Mirror opens a real headless browser for each persona. These are full Chromium instances, not simulated or mocked environments. Each persona navigates your live site exactly as a real user would: clicking links, filling out forms, scrolling, and reading content.

At every step, the system captures a screenshot and the page's accessibility tree. An AI model (Claude) looks at the screenshot through the persona's eyes, generates a think-aloud narration ("I'm looking for the sign-up button but I only see a login link..."), decides what action to take next, and flags any UX issues it encounters along the way.

All personas run in parallel, so a five-persona study takes roughly the same time as a single-persona study.

### Analysis

After navigation completes, a deeper analysis pass examines every screenshot in detail. This second pass catches issues that real-time navigation might miss, such as visual hierarchy problems, inconsistent styling, or accessibility gaps.

The system then synthesizes findings across all personas to identify patterns: issues that tripped up everyone, problems unique to certain user types, and comparative differences in how personas experienced the same flows.

### Report Generation

All findings are compiled into a structured report with an executive summary, ranked issues, actionable recommendations, and supporting evidence from session data.

---

## Study Lifecycle

Every study moves through four stages:

| Stage | What happens | Duration |
|-------|-------------|----------|
| **Setup** | You configure the URL, tasks, and personas. | Manual (you control this) |
| **Running** | Personas navigate your site in parallel. Real-time progress is streamed to your dashboard. | 1-3 minutes typically |
| **Analyzing** | Screenshots are analyzed in depth. Cross-persona insights are synthesized. | 1-2 minutes typically |
| **Complete** | Scores, issues, replays, heatmaps, and the full report are available. | Instant once analysis finishes |

You can watch the study in real time during the Running phase. Each persona's current step, think-aloud narration, and emotional state are streamed live to the progress view.

---

## What You Get

### UX Scores

A numeric usability score (0-100) for the overall site and per persona. Scores are based on task completion, navigation efficiency, issue severity, and accessibility.

### Issues

Every issue includes:

| Field | Description |
|-------|-------------|
| Description | What the problem is and where it occurs |
| Severity | Critical, Major, Minor, or Enhancement |
| Heuristic | Which usability principle is violated (based on Nielsen's heuristics) |
| WCAG criterion | Relevant accessibility guideline, if applicable |
| Recommendation | A specific, actionable fix |
| Page URL | Exact page where the issue was found |

### Session Replays

Step-by-step playback of each persona's session. Every step shows the screenshot the persona saw, the think-aloud narration explaining their thought process, the action they took, and their confidence and emotional state.

### Heatmaps

Aggregate click and scroll data across all personas, overlaid on each page. Heatmaps reveal where attention concentrates and where users miss important elements.

### Reports

Export the full analysis as a PDF or Markdown document. Reports include the executive summary, all issues ranked by severity, recommendations prioritized by impact and effort, and evidence from session data.

---

## Mirror vs. Traditional Usability Testing

| | Traditional testing | Mirror |
|---|---|---|
| **Cost** | $12,000+ per study | A fraction of the cost |
| **Time to results** | 2-4 weeks (recruiting, scheduling, sessions, analysis) | Under 5 minutes |
| **Participants** | 5-8 typical (limited by budget) | As many personas as you need |
| **Coverage** | Limited to recruited demographics | Broad demographic and behavioral range |
| **Consistency** | Varies by moderator and participant | Reproducible and consistent |
| **Availability** | Business hours, scheduling required | On demand, any time |
| **Session recordings** | Video files requiring manual review | Structured step-by-step replays with annotated narration |
| **Analysis** | Manual synthesis by researchers | Automated cross-persona synthesis |

Mirror is not a replacement for talking to real humans. It is a way to catch 80% of usability issues before you invest in a full research study, and to test iteratively as you ship changes.
