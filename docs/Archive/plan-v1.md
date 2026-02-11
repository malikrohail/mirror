# MIRROR — AI User Testing Platform

## Hackathon: Built with Opus 4.6 (Claude Code Hackathon)
## Problem Statement 2: Break the Barriers
## Timeline: 1 Month (Feb 10 – Mar 10, 2026)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [The Problem](#2-the-problem)
3. [Competitive Landscape](#3-competitive-landscape)
4. [Product Vision](#4-product-vision)
5. [Target Users](#5-target-users)
6. [Core Features & User Stories](#6-core-features--user-stories)
7. [Technical Architecture](#7-technical-architecture)
8. [AI Pipeline — Opus 4.6 Usage](#8-ai-pipeline--opus-46-usage)
9. [Persona Engine Design](#9-persona-engine-design)
10. [Wireframes](#10-wireframes)
11. [Data Model](#11-data-model)
12. [API Design](#12-api-design)
13. [Tech Stack](#13-tech-stack)
14. [Repo Structure](#14-repo-structure)
15. [4-Week Roadmap](#15-4-week-roadmap)
16. [Demo Strategy](#16-demo-strategy)
17. [Risk Mitigations](#17-risk-mitigations)
18. [Hackathon Scoring Optimization](#18-hackathon-scoring-optimization)
19. [Submission Draft](#19-submission-draft)

---

## 1. Executive Summary

**Mirror** is an AI-powered user testing platform that creates realistic AI personas, has them navigate your live website using real browser automation, captures annotated screenshots at every step, and generates actionable UX insights — all in under 5 minutes.

Traditional user testing costs **$12K–$18K per study** and takes **4–10 weeks**. Mirror delivers 80% of those insights in **5 minutes** for **pennies**.

**Why this can't be "just pasted into Claude":**
- Requires **Playwright browser automation** to navigate live websites
- Uses **multimodal vision** (screenshots) at every navigation step
- Runs **multiple AI personas in parallel** (multi-agent orchestration)
- Produces **session recordings, heatmaps, and comparative analytics**
- Needs **persistent state** across multi-step navigation sessions

**Tagline:** *"Watch AI personas break your website — so real users don't have to."*

---

## 2. The Problem

### The UX Testing Paradox

Every product team knows they should do user testing. Almost none do it regularly.

**Why:**
- **Cost**: A moderated study with 15-20 participants costs $12K-$18K
- **Time**: Recruitment → testing → analysis takes 4-10 weeks
- **Expertise**: Requires trained UX researchers to design studies and interpret results
- **Frequency**: Most teams test 1-2x/year instead of every sprint
- **Access**: Startups and small teams can't afford any of it

**The result:** Products ship with obvious usability problems that would have been caught by watching 5 users try to complete basic tasks.

### Jakob Nielsen's "5 Users" Insight

Nielsen's research shows **5 users find 85% of usability problems**. You don't need 50 participants — you need 5 diverse ones navigating your product with real goals. But even 5 users cost $1,500-$3,000 to recruit, schedule, and compensate.

### What If the 5 Users Were AI?

Mirror creates 5+ AI personas — each with distinct demographics, tech literacy, goals, and behavioral patterns — and has them actually navigate your live website using a real browser. Not a prototype. Not a mockup. Your actual deployed product.

Each persona:
1. Receives a task ("Sign up and create your first project")
2. Navigates using Playwright (real clicks, real scrolls, real form fills)
3. Gets screenshotted at every step
4. Claude Opus 4.6 analyzes each screenshot for UX issues
5. The persona "thinks aloud" about what's confusing
6. After the session, generates a structured usability report

**The 50-100x cost reduction**: What costs $12K+ and takes weeks → costs ~$2 in API calls and takes 5 minutes.

---

## 3. Competitive Landscape

### The Gap Is Wide Open

```
                AI-ONLY TESTING ──────────────────── REAL BROWSER TESTING
                     |                                        |
  HIGH PERSONA   Synthetic Users              ★ MIRROR ★
  SOPHISTICATION (interviews only)            (AI personas + live browser
                 Uxia (prototypes)             + vision analysis + reports)
                     |                              |
                     |                         UXAgent (academic, CHI 2025)
                     |                         Loop11 AI Agents (different focus)
                     |                              |
  LOW PERSONA    Maze AI                       Stagehand/Browser-Use
  SOPHISTICATION UserTesting AI                Skyvern
                 (analysis only)              (automation only, no UX focus)
                     |                              |
                PROTOTYPE/SURVEY ────────────── LIVE WEBSITE
```

### Key Competitors

| Tool | What It Does | Why It's Not Mirror |
|------|-------------|-------------------|
| **Synthetic Users** | AI persona interviews & surveys | Never touches a real website. Conversational only. |
| **Uxia** | AI users test uploaded prototypes | Works on designs, not live sites. Known positivity bias. |
| **UXAgent** (CHI 2025) | Academic: AI personas navigate real sites | No vision analysis. No commercial UI. No multimodal. Paper only. |
| **Loop11 AI Agents** | AI agents navigate real sites | Tests AI-readiness, not human UX simulation. No personas. |
| **UserTesting** | Real humans test with AI analysis | $30K-$100K/yr. AI only analyzes, doesn't test. |
| **Maze** | Unmoderated testing on Figma prototypes | Not live sites. Still needs real humans. |

### Our Moat

1. **Only tool combining:** Rich AI personas + live browser automation + multimodal vision analysis
2. **Closest academic work (UXAgent) lacks:** Vision/screenshot analysis, commercial UI, CI/CD integration, comparative persona insights
3. **Can't be replicated by "paste into Claude":** Requires browser automation, persistent multi-step sessions, parallel multi-agent runs, visual heatmap generation

---

## 4. Product Vision

### One-Liner
Mirror lets you run a complete usability study on your live website in 5 minutes using AI personas that actually click, scroll, and get confused — just like real users.

### Core Value Proposition
| For | Who | Mirror Is | That | Unlike |
|-----|-----|----------|------|--------|
| Product teams & indie devs | Need usability feedback but can't afford traditional testing | An AI-powered usability testing tool | Runs realistic AI personas on your live website and generates actionable UX reports in minutes | Synthetic Users (no real browsing), UserTesting ($30K+/yr), or "just paste into Claude" (no browser interaction) |

### V1 Scope (Hackathon)

**In scope:**
- Persona generation engine (demographics, goals, tech literacy, accessibility needs)
- Playwright-based browser navigation with AI decision-making
- Screenshot capture + Claude Opus 4.6 vision analysis at every step
- Think-aloud narration from each persona
- Session replay viewer (step-by-step screenshots with annotations)
- Comparative insight dashboard (where different personas struggle)
- Heatmap visualization (click/attention aggregation)
- PDF/Markdown report export
- URL input + task definition UI
- Pre-built persona templates (+ custom persona builder)

**Out of scope (v2+):**
- CI/CD GitHub Action integration
- Competitive benchmarking (test against competitor sites)
- Video recording (full session video)
- Real-time collaboration
- Figma/prototype testing mode
- Mobile device emulation (stretch goal — Playwright supports it)

---

## 5. Target Users

### Primary: Indie Developers & Small Product Teams
- Ship features weekly, never do usability testing
- Can't afford $12K studies or UserTesting licenses
- Want quick signal on "does my signup flow make sense?"
- Technical enough to paste a URL and define a task

### Secondary: UX Designers & Researchers
- Use Mirror for rapid iteration between human studies
- Quick sanity check before deploying changes
- Want persona-comparative insights they can't get elsewhere
- Supplement (not replace) their human testing practice

### Tertiary: Agencies & Consultants
- Run UX audits for clients
- Need fast turnaround on usability reports
- White-label potential (future)

---

## 6. Core Features & User Stories

### F1: Study Setup
```
As a user, I want to:
- Enter my website URL
- Define 1-3 tasks for personas to complete (e.g., "Sign up and create a project")
- Select from pre-built persona templates OR create custom ones
- Choose number of personas (3, 5, 10)
- Hit "Run Study" and get results in ~5 minutes
```

### F2: Persona Engine
```
As a user, I want to:
- Choose from 8 pre-built persona templates covering common demographics
- Create custom personas with specific attributes
- See each persona's "profile card" with their background, goals, and quirks
- Understand WHY a persona behaves a certain way (traceability)
```

**Pre-built Persona Templates:**

| Persona | Age | Tech Literacy | Key Trait |
|---------|-----|--------------|-----------|
| 🎓 College Student | 20 | High | Impatient, skims content, expects modern UI |
| 👴 Retiree | 68 | Low | Reads everything carefully, confused by icons without labels |
| 💼 Busy Professional | 35 | Medium | Goal-oriented, frustrated by unnecessary steps |
| ♿ Screen Reader User | 40 | High | Navigates via keyboard/ARIA, can't see visual cues |
| 🌍 Non-Native Speaker | 28 | Medium | Struggles with idioms, jargon, and culturally-specific references |
| 📱 Mobile-First User | 22 | High | Expects swipe/tap patterns, frustrated by desktop-only layouts |
| 🔒 Privacy-Conscious User | 45 | High | Hesitates at data collection, reads privacy policies |
| 👶 First-Time User | 30 | Low | No product context, needs onboarding, easily overwhelmed |

### F3: AI Navigation Engine
```
As a user, I want to:
- Watch (via session replay) each persona navigate my site
- See the persona's "thought process" at each step (think-aloud)
- See which elements they noticed, which they missed
- See where they hesitated, backtracked, or got confused
```

### F4: Vision Analysis Engine
```
As a user, I want to:
- Get screenshot-by-screenshot analysis of UX issues
- See visual annotations (bounding boxes) on problem areas
- Get severity ratings (Critical / Major / Minor / Enhancement)
- Get specific fix recommendations for each issue
```

### F5: Insight Dashboard
```
As a user, I want to:
- See an executive summary of findings across all personas
- View a "struggle map" showing where different personas had trouble
- See a click heatmap aggregated across all persona sessions
- Filter insights by persona, severity, page, or issue type
- Compare how different personas experienced the same flow
```

### F6: Session Replay
```
As a user, I want to:
- Step through each persona's session screenshot-by-screenshot
- See the persona's internal thoughts at each step
- See detected UX issues highlighted on each screenshot
- Play/pause/scrub through the session timeline
```

### F7: Report Export
```
As a user, I want to:
- Export a polished PDF report I can share with my team
- Get a Markdown summary I can paste into a PR or Notion doc
- Include specific screenshots with annotations in the report
```

---

## 7. Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (Next.js)                         │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │  Study    │  │  Persona  │  │  Session  │  │  Insight          │  │
│  │  Setup    │  │  Builder  │  │  Replay   │  │  Dashboard        │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬──────────┘  │
│       │              │              │                  │             │
│       └──────────────┴──────┬───────┴──────────────────┘             │
│                             │                                        │
│                      WebSocket + REST                                │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────────────┐
│                        BACKEND (FastAPI / Python)                    │
│                                                                      │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────────────┐  │
│  │  Study        │  │  Persona       │  │  Report                  │  │
│  │  Orchestrator │  │  Generator     │  │  Generator               │  │
│  │  (manages     │  │  (Opus 4.6)    │  │  (Opus 4.6 synthesis)    │  │
│  │  parallel     │  │                │  │                          │  │
│  │  sessions)    │  │                │  │                          │  │
│  └──────┬───────┘  └───────┬───────┘  └──────────────────────────┘  │
│         │                  │                                         │
│  ┌──────┴──────────────────┴──────────────────────────────────────┐  │
│  │                   NAVIGATION ENGINE                             │  │
│  │                                                                 │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐               │  │
│  │  │  Agent 1    │  │  Agent 2    │  │  Agent N    │  (parallel)  │  │
│  │  │  (Persona A)│  │  (Persona B)│  │  (Persona N)│             │  │
│  │  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘               │  │
│  │         │               │               │                       │  │
│  │  ┌──────┴───────────────┴───────────────┴──────────────────┐   │  │
│  │  │              PLAYWRIGHT BROWSER POOL                     │   │  │
│  │  │  (Headless Chromium instances, one per persona)          │   │  │
│  │  └─────────────────────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    ANALYSIS ENGINE                              │  │
│  │                                                                 │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │  │
│  │  │  Screenshot   │  │  Heatmap      │  │  Comparative         │ │  │
│  │  │  Analyzer     │  │  Generator    │  │  Insight Synthesizer │ │  │
│  │  │  (Opus 4.6    │  │  (aggregates  │  │  (cross-persona      │ │  │
│  │  │  vision)      │  │  click data)  │  │  analysis)           │ │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘ │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────┐                                              │
│  │  SQLite + File     │  (sessions, screenshots, analysis results)   │
│  │  Storage            │                                              │
│  └────────────────────┘                                              │
└──────────────────────────────────────────────────────────────────────┘
```

### Navigation Agent Loop (Per Persona)

```
┌─────────────────────────────────────────────────────────┐
│                  AGENT LOOP (per persona)                 │
│                                                          │
│  START: page.goto(url)                                   │
│     │                                                    │
│     ▼                                                    │
│  ┌──────────────────────┐                                │
│  │ 1. PERCEIVE          │                                │
│  │  - Take screenshot   │                                │
│  │  - Get a11y tree     │                                │
│  │  - Get page URL      │                                │
│  │  - Get page title    │                                │
│  └──────────┬───────────┘                                │
│             ▼                                            │
│  ┌──────────────────────┐                                │
│  │ 2. THINK             │                                │
│  │  Claude Opus 4.6:    │                                │
│  │  - Persona context   │                                │
│  │  - Screenshot (img)  │                                │
│  │  - A11y tree (text)  │                                │
│  │  - Task goal         │                                │
│  │  - History so far    │                                │
│  │                      │                                │
│  │  Returns:            │                                │
│  │  - think_aloud: str  │  ← "I see a login button      │
│  │  - ux_issues: []     │     but no sign-up option..."  │
│  │  - action: Action    │                                │
│  │  - confidence: float │                                │
│  │  - task_progress: %  │                                │
│  └──────────┬───────────┘                                │
│             ▼                                            │
│  ┌──────────────────────┐                                │
│  │ 3. ACT               │                                │
│  │  Execute action:     │                                │
│  │  - click(selector)   │                                │
│  │  - type(selector,v)  │                                │
│  │  - scroll(direction) │                                │
│  │  - navigate(url)     │                                │
│  │  - wait()            │                                │
│  │  - done()            │                                │
│  └──────────┬───────────┘                                │
│             ▼                                            │
│  ┌──────────────────────┐                                │
│  │ 4. RECORD            │                                │
│  │  - Save screenshot   │                                │
│  │  - Save think-aloud  │                                │
│  │  - Save UX issues    │                                │
│  │  - Save action taken │                                │
│  │  - Update click map  │                                │
│  └──────────┬───────────┘                                │
│             ▼                                            │
│      task_progress == 100%                               │
│      OR max_steps reached                                │
│      OR persona gave up?                                 │
│         │          │                                     │
│        YES         NO ──→ loop back to PERCEIVE          │
│         │                                                │
│         ▼                                                │
│  ┌──────────────────────┐                                │
│  │ 5. POST-SESSION      │                                │
│  │  - Generate session  │                                │
│  │    summary           │                                │
│  │  - Rate overall UX   │                                │
│  │  - Top 3 pain points │                                │
│  │  - Would recommend?  │                                │
│  └──────────────────────┘                                │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Concurrency Model

```
Study Orchestrator
    │
    ├── Agent 1 (Persona: College Student)  ──→ Browser 1
    │      └── 15-25 steps, ~2-3 min
    │
    ├── Agent 2 (Persona: Retiree)          ──→ Browser 2
    │      └── 15-25 steps, ~2-3 min
    │
    ├── Agent 3 (Persona: Busy Professional) ──→ Browser 3
    │      └── 15-25 steps, ~2-3 min
    │
    ├── Agent 4 (Persona: Screen Reader User) ──→ Browser 4
    │      └── 15-25 steps, ~2-3 min
    │
    └── Agent 5 (Persona: First-Time User)   ──→ Browser 5
           └── 15-25 steps, ~2-3 min

All run in parallel via asyncio
WebSocket streams progress to frontend in real-time
Total wall time: ~3-5 minutes for 5 personas
```

---

## 8. AI Pipeline — Opus 4.6 Usage

Mirror uses Claude Opus 4.6 in **5 distinct pipeline stages**, each with dedicated system prompts optimized for the specific task.

### Stage 1: Persona Generation

**Input:** User-selected template or custom attributes
**Output:** Rich persona profile (JSON)

```
System Prompt:
You are a UX research expert. Generate a realistic user persona for
usability testing. The persona should feel like a real person, not a
caricature. Include realistic details that would affect how they
interact with a website.

Output JSON schema:
{
  "name": "string",
  "age": number,
  "occupation": "string",
  "location": "string",
  "tech_literacy": "low | medium | high",
  "device_preference": "desktop | mobile | tablet",
  "browsing_behavior": "string (how they typically use websites)",
  "frustration_triggers": ["string"],
  "accessibility_needs": ["string"] | null,
  "goals": "string (what they want from this type of product)",
  "personality_brief": "string (2-3 sentences defining how they approach new websites)",
  "patience_level": "low | medium | high",
  "reading_speed": "skims | moderate | thorough"
}
```

**Opus 4.6 value:** Deep reasoning creates personas that feel genuinely human — not generic "User A" profiles. The persona's personality directly shapes navigation behavior.

### Stage 2: Navigation Decision-Making (Per Step)

**Input:** Screenshot (image) + accessibility tree (text) + persona context + task + history
**Output:** Think-aloud narration + UX issues detected + next action

```
System Prompt:
You are {persona.name}, a {persona.age}-year-old {persona.occupation}
from {persona.location}. Your tech literacy is {persona.tech_literacy}.

You are trying to: {task_description}

Your personality: {persona.personality_brief}
Your frustration triggers: {persona.frustration_triggers}
Your browsing behavior: {persona.browsing_behavior}
Your patience level: {persona.patience_level}

THINK AND ACT as this person would. If they would be confused, BE
confused. If they would miss a button, MISS it. If they would
misunderstand a label, MISUNDERSTAND it.

Based on the current screenshot and accessibility tree, respond with:
{
  "think_aloud": "What you're thinking right now as this persona (1-3 sentences)",
  "ux_issues": [
    {
      "element": "description of the problematic element",
      "issue": "what's wrong from this persona's perspective",
      "severity": "critical | major | minor | enhancement",
      "heuristic": "which Nielsen heuristic this violates (if applicable)"
    }
  ],
  "action": {
    "type": "click | type | scroll | navigate | wait | give_up | done",
    "selector": "accessibility tree ref or descriptive selector",
    "value": "text to type (if type action)",
    "reason": "why this persona would take this action"
  },
  "confidence": 0.0-1.0,  // how confident the persona is about this action
  "task_progress": 0-100,  // estimated % of task completion
  "emotional_state": "confident | curious | confused | frustrated | lost | satisfied"
}
```

**Opus 4.6 value:** This is the core differentiator. Opus 4.6's superior reasoning + vision capabilities allow it to:
- Actually "role-play" as different persona types convincingly
- Detect subtle UX issues from screenshots (small text, poor contrast, confusing layouts)
- Make navigation decisions that reflect the persona's tech literacy
- Provide genuine think-aloud narration, not generic descriptions

### Stage 3: Screenshot UX Analysis

**Input:** Screenshot (image) + page context
**Output:** Detailed visual UX audit

```
System Prompt:
You are a senior UX designer performing a heuristic evaluation.
Analyze this screenshot for usability issues. Apply Nielsen's 10
heuristics, WCAG accessibility guidelines, and modern UX best practices.

Be specific. Reference exact visual elements. Do not give vague advice.

{
  "page_assessment": {
    "visual_hierarchy": "score 1-10 + explanation",
    "readability": "score 1-10 + explanation",
    "navigation_clarity": "score 1-10 + explanation",
    "cta_effectiveness": "score 1-10 + explanation",
    "accessibility_estimate": "score 1-10 + explanation",
    "overall": "score 1-10"
  },
  "issues": [
    {
      "element": "specific element description",
      "location": "top-left | top-center | top-right | ... | bottom-right",
      "issue": "detailed description",
      "severity": "critical | major | minor | enhancement",
      "heuristic": "Nielsen heuristic violated",
      "recommendation": "specific fix suggestion",
      "wcag": "WCAG criterion if applicable"
    }
  ],
  "strengths": ["what's working well"]
}
```

### Stage 4: Cross-Persona Insight Synthesis

**Input:** All session data from all personas
**Output:** Comparative analysis + prioritized findings

```
System Prompt:
You are a UX research lead synthesizing findings from a multi-persona
usability study. You have session data from {n} personas who each
attempted to complete tasks on the same website.

Generate a synthesis that highlights:
1. Universal issues (problems ALL personas encountered)
2. Persona-specific issues (problems only certain demographics hit)
3. Critical paths where users diverged
4. Task completion analysis
5. Prioritized recommendations

{
  "executive_summary": "3-5 sentence overview of key findings",
  "task_completion": {
    "task_name": {
      "completed_by": ["persona names"],
      "failed_by": ["persona names"],
      "average_steps": number,
      "average_time_seconds": number
    }
  },
  "universal_issues": [...],
  "persona_specific_issues": {
    "low_tech_literacy": [...],
    "accessibility": [...],
    "mobile_users": [...],
    // etc.
  },
  "struggle_map": [
    {
      "page_url": "string",
      "element": "string",
      "personas_affected": ["names"],
      "issue": "string",
      "severity": "critical | major | minor"
    }
  ],
  "prioritized_recommendations": [
    {
      "rank": 1,
      "recommendation": "string",
      "impact": "high | medium | low",
      "effort": "high | medium | low",
      "personas_helped": ["names"],
      "evidence": "string"
    }
  ],
  "overall_ux_score": 0-100,
  "would_recommend_rate": "X/N personas"
}
```

### Stage 5: Report Generation

**Input:** All analysis data
**Output:** Polished PDF/Markdown report

```
System Prompt:
You are a UX consultant writing a professional usability report for a
client. Use the data provided to create a clear, actionable report.

Include: Executive summary, methodology, key findings with annotated
screenshots, persona-by-persona breakdown, prioritized recommendations
with effort/impact matrix, and next steps.

Write in a professional but accessible tone. Use specific examples from
the sessions. Reference exact screenshots by step number.
```

### Opus 4.6 Usage Summary

| Stage | Calls/Study | Tokens/Call | Vision? | Total Cost (est.) |
|-------|------------|-------------|---------|-------------------|
| Persona Generation | 5 | ~2K out | No | ~$0.15 |
| Navigation Decisions | ~100 (5×20 steps) | ~1.5K in + 500 out | Yes (screenshot) | ~$6.00 |
| Screenshot Analysis | ~100 | ~1.5K in + 1K out | Yes | ~$8.00 |
| Insight Synthesis | 1 | ~10K in + 3K out | No | ~$0.50 |
| Report Generation | 1 | ~10K in + 5K out | No | ~$0.75 |
| **Total per study** | **~207** | | | **~$15.40** |

*Note: Costs based on Opus 4.6 pricing. Can optionally use Sonnet 4.5 for navigation decisions to reduce cost to ~$3/study.*

---

## 9. Persona Engine Design

### Persona Attribute Schema

```typescript
interface PersonaProfile {
  // Identity
  name: string;
  age: number;
  gender: string;
  occupation: string;
  location: string;

  // Technical profile
  tech_literacy: "low" | "medium" | "high";
  device_preference: "desktop" | "mobile" | "tablet";
  browser_preference: string;
  typing_speed: "slow" | "moderate" | "fast";

  // Behavioral profile
  browsing_behavior: string;
  patience_level: "low" | "medium" | "high";
  reading_speed: "skims" | "moderate" | "thorough";
  frustration_triggers: string[];
  trust_level: "skeptical" | "neutral" | "trusting";

  // Accessibility
  accessibility_needs: {
    vision: "none" | "low_vision" | "color_blind" | "blind";
    motor: "none" | "limited_fine_motor" | "keyboard_only";
    cognitive: "none" | "dyslexia" | "adhd" | "low_literacy";
  };

  // Goals & Context
  primary_goal: string;
  familiarity_with_product: "none" | "heard_of_it" | "tried_before" | "regular_user";
  what_brought_them_here: string;

  // Personality (OCEAN model)
  openness: number;       // 0-1
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}
```

### Behavioral Modifiers

The persona's attributes directly modify navigation behavior:

| Attribute | Low Value Behavior | High Value Behavior |
|-----------|-------------------|-------------------|
| tech_literacy | Reads every label, confused by icons, slow to find navigation | Jumps to expected locations, uses keyboard shortcuts, skips tutorials |
| patience_level | Gives up after 3 failed attempts, bounces quickly | Tries multiple approaches, reads help docs, perseveres |
| reading_speed (skims) | Misses body text, only sees headlines and CTAs | — |
| reading_speed (thorough) | — | Reads every word, notices fine print, slower progress |
| trust_level (skeptical) | Hesitates at sign-up forms, looks for privacy policy, avoids entering real data | — |
| openness (high) | — | Explores sidebar features, clicks "what's this?", tries unexpected paths |
| neuroticism (high) | Anxious about errors, re-reads confirmation messages, worried about data loss | — |

### Persona-Specific Navigation Failures

Mirror doesn't just navigate successfully — it fails in persona-appropriate ways:

- **Low tech literacy persona** → Misses hamburger menu, doesn't understand icons without labels, clicks logos expecting "home"
- **Elderly persona** → Struggles with small text, misses low-contrast elements, overwhelmed by busy layouts
- **Screen reader persona** → Can't access elements without ARIA labels, trapped in tab order loops, frustrated by auto-playing media
- **Impatient persona** → Skips onboarding, abandons long forms, clicks first CTA without reading
- **Non-native speaker** → Confused by idioms ("Get Started" vs "Sign Up"), misinterprets jargon

---

## 10. Wireframes

### Screen 1: Landing Page / Dashboard

```
┌──────────────────────────────────────────────────────────────┐
│  🪞 Mirror                                    [Sign In]      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│     Watch AI personas break your website                     │
│     — so real users don't have to.                           │
│                                                              │
│     ┌──────────────────────────────────────────────────┐     │
│     │  Enter your website URL                          │     │
│     │  ┌──────────────────────────────────────┐  ┌───┐ │     │
│     │  │ https://your-website.com             │  │ → │ │     │
│     │  └──────────────────────────────────────┘  └───┘ │     │
│     └──────────────────────────────────────────────────┘     │
│                                                              │
│  ── Recent Studies ──────────────────────────────────────    │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────┐  │
│  │ my-saas.com      │  │ portfolio.dev    │  │ + New     │  │
│  │ 5 personas       │  │ 3 personas       │  │   Study   │  │
│  │ Score: 72/100    │  │ Score: 85/100    │  │           │  │
│  │ 12 issues found  │  │ 4 issues found   │  │           │  │
│  │ 2 hours ago      │  │ Yesterday        │  │           │  │
│  └──────────────────┘  └──────────────────┘  └───────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Screen 2: Study Setup

```
┌──────────────────────────────────────────────────────────────┐
│  🪞 Mirror  >  New Study                        [Cancel]     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  STEP 1 OF 3: Target Website                                 │
│  ━━━━━━━━━━━━━━━━━━ ○──────── ○────────                      │
│                                                              │
│  Website URL                                                 │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ https://                                             │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  Starting Page (optional)                                    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ /pricing  (leave blank for homepage)                 │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ── Tasks to Complete ──────────────────────────────────     │
│                                                              │
│  Task 1:                                                     │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Sign up for a free account and create your first     │    │
│  │ project                                              │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  Task 2 (optional):                                          │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Find the pricing page and identify the plan that     │    │
│  │ includes team collaboration                          │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  [+ Add Task]                                                │
│                                                              │
│                                              [Next: Personas →] │
└──────────────────────────────────────────────────────────────┘
```

### Screen 3: Persona Selection

```
┌──────────────────────────────────────────────────────────────┐
│  🪞 Mirror  >  New Study  >  Personas           [← Back]    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  STEP 2 OF 3: Choose Your Testers                            │
│  ──────────── ━━━━━━━━━━━━━━━━━━ ○────────                   │
│                                                              │
│  Select persona templates:                                   │
│                                                              │
│  ┌─────────────────────────┐  ┌─────────────────────────┐   │
│  │ [✓] 🎓 College Student  │  │ [✓] 👴 Retiree          │   │
│  │ Age: 20 | Tech: High    │  │ Age: 68 | Tech: Low     │   │
│  │ Impatient, skims,       │  │ Reads everything,        │   │
│  │ expects modern UI       │  │ needs clear labels       │   │
│  └─────────────────────────┘  └─────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────┐  ┌─────────────────────────┐   │
│  │ [✓] 💼 Busy Professional│  │ [ ] ♿ Screen Reader     │   │
│  │ Age: 35 | Tech: Medium  │  │ Age: 40 | Tech: High    │   │
│  │ Goal-oriented, hates    │  │ Keyboard-only,           │   │
│  │ unnecessary steps       │  │ needs ARIA labels        │   │
│  └─────────────────────────┘  └─────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────┐  ┌─────────────────────────┐   │
│  │ [✓] 🌍 Non-Native       │  │ [ ] 📱 Mobile-First     │   │
│  │ Age: 28 | Tech: Medium  │  │ Age: 22 | Tech: High    │   │
│  │ Struggles with jargon   │  │ Expects tap/swipe        │   │
│  │ and idioms              │  │ patterns                 │   │
│  └─────────────────────────┘  └─────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────┐  ┌─────────────────────────┐   │
│  │ [ ] 🔒 Privacy-Conscious│  │ [✓] 👶 First-Time User  │   │
│  │ Age: 45 | Tech: High    │  │ Age: 30 | Tech: Low     │   │
│  │ Hesitates at data       │  │ No product context,      │   │
│  │ collection forms        │  │ easily overwhelmed       │   │
│  └─────────────────────────┘  └─────────────────────────┘   │
│                                                              │
│  [+ Create Custom Persona]                                   │
│                                                              │
│  Selected: 5 personas            [Next: Review & Run →]      │
└──────────────────────────────────────────────────────────────┘
```

### Screen 4: Study Running (Live Progress)

```
┌──────────────────────────────────────────────────────────────┐
│  🪞 Mirror  >  Study Running                                │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Testing: https://my-saas.com                                │
│  Task: "Sign up and create your first project"               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 68%                     │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │            LIVE SCREENSHOT PREVIEW                     │  │
│  │         (shows most recent screenshot                  │  │
│  │          from selected persona)                        │  │
│  │                                                        │  │
│  │    ┌─────────────────────────────────┐                 │  │
│  │    │  [my-saas.com signup page]      │                 │  │
│  │    │                                 │                 │  │
│  │    │  ⬤ ← click annotation          │                 │  │
│  │    │                                 │                 │  │
│  │    └─────────────────────────────────┘                 │  │
│  │                                                        │  │
│  │  💬 "I see the sign-up form but I'm not sure what      │  │
│  │      'workspace' means. I'll just type my name..."     │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ── Persona Progress ────────────────────────────────────    │
│                                                              │
│  🎓 College Student    ━━━━━━━━━━━━━━━━━━ Step 12/20  ✅    │
│     "Done! That was pretty straightforward."                 │
│                                                              │
│  👴 Retiree            ━━━━━━━━━━━━━━━━━━ Step 15/25  🔄    │
│     "I can't find where to confirm my email..."              │
│                                                              │
│  💼 Busy Professional  ━━━━━━━━━━━━━━━━━━ Step 8/20   🔄    │
│     "Why do I need to fill out all these fields?"            │
│                                                              │
│  🌍 Non-Native Speaker ━━━━━━━━━━━━━━━━━━ Step 10/20  ⚠️    │
│     "I don't understand what 'onboard' means here"           │
│                                                              │
│  👶 First-Time User    ━━━━━━━━━━━━━━━━━━ Step 18/25  ❌    │
│     "I give up. I can't figure out how to create a project." │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Screen 5: Results Dashboard

```
┌──────────────────────────────────────────────────────────────┐
│  🪞 Mirror  >  Results: my-saas.com     [Export PDF] [Share] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │  UX Score    │  │  Issues Found │  │  Task Completion    │ │
│  │             │  │              │  │                     │ │
│  │    72/100    │  │      14      │  │     3/5 (60%)       │ │
│  │             │  │  🔴4 🟡6 🟢4 │  │  personas succeeded │ │
│  └─────────────┘  └──────────────┘  └─────────────────────┘ │
│                                                              │
│  [Overview] [Session Replay] [Heatmap] [Issues] [Report]     │
│  ━━━━━━━━━━                                                  │
│                                                              │
│  ── Executive Summary ──────────────────────────────────     │
│                                                              │
│  The signup flow works well for tech-savvy users but creates │
│  significant barriers for low-tech-literacy and non-native   │
│  English speakers. 2 of 5 personas failed to complete the    │
│  primary task. Key issues: confusing jargon in the signup    │
│  form ("workspace"), missing visual feedback after email     │
│  verification, and a 7-step onboarding that overwhelms       │
│  first-time users.                                           │
│                                                              │
│  ── Struggle Map ───────────────────────────────────────     │
│                                                              │
│  Homepage → Sign Up → [BOTTLENECK] → Email Verify →          │
│  Onboarding → [BOTTLENECK] → Create Project → Done           │
│                                                              │
│  🔴 Sign Up Form: 3/5 personas confused by "workspace" field │
│  🔴 Onboarding: 2/5 personas overwhelmed, 1 gave up          │
│  🟡 Email Verify: 2/5 personas couldn't find confirmation    │
│  🟡 Create Project: 1/5 persona missed the "+" button        │
│                                                              │
│  ── Persona Comparison ─────────────────────────────────     │
│                                                              │
│  Persona              │ Steps │ Completed │ Top Issue         │
│  ─────────────────────┼───────┼───────────┼──────────────────│
│  🎓 College Student   │  12   │    ✅     │ Minor: small CTA │
│  👴 Retiree           │  22   │    ✅     │ Low contrast text │
│  💼 Busy Professional │  10   │    ✅     │ Too many steps    │
│  🌍 Non-Native Speaker│  18   │    ❌     │ Jargon confusion  │
│  👶 First-Time User   │  25   │    ❌     │ Overwhelming UX   │
│                                                              │
│  ── Top Recommendations ────────────────────────────────     │
│                                                              │
│  1. 🔴 Replace "workspace" with "team name" in signup form   │
│     Impact: High | Effort: Low | Helps: 3/5 personas        │
│                                                              │
│  2. 🔴 Reduce onboarding to 3 steps (from 7)                │
│     Impact: High | Effort: Medium | Helps: 2/5 personas     │
│                                                              │
│  3. 🟡 Add visual confirmation after email verification      │
│     Impact: Medium | Effort: Low | Helps: 2/5 personas      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Screen 6: Session Replay

```
┌──────────────────────────────────────────────────────────────┐
│  🪞 Mirror  >  Results  >  Session: 👴 Retiree   [← Back]   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │              ANNOTATED SCREENSHOT                      │  │
│  │                                                        │  │
│  │    ┌─────────────────────────────────┐                 │  │
│  │    │  [my-saas.com/signup]           │                 │  │
│  │    │                                 │                 │  │
│  │    │  ┌─ ⚠️ Issue ─────────────┐     │                 │  │
│  │    │  │ "Workspace" label is   │     │                 │  │
│  │    │  │ confusing. Consider    │     │                 │  │
│  │    │  │ "Team Name" instead.   │     │                 │  │
│  │    │  └────────────────────────┘     │                 │  │
│  │    │                                 │                 │  │
│  │    │  ⬤ ← cursor position            │                 │  │
│  │    │                                 │                 │  │
│  │    └─────────────────────────────────┘                 │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ── Step 8 of 22 ──                                          │
│  [|◀] [◀] [━━━━━━━●━━━━━━━━━━━━━━━━━━] [▶] [▶|]            │
│                                                              │
│  ── Think Aloud ────────────────────────────────────────     │
│  💬 "It's asking for a 'workspace name.' I don't know        │
│      what that means. Is it my company name? My name?        │
│      I'll just type 'My Workspace' and hope for the best."   │
│                                                              │
│  ── Issues Detected ────────────────────────────────────     │
│  🟡 MAJOR: "Workspace" terminology is unclear for            │
│     non-technical users. No tooltip or help text provided.   │
│     Heuristic: Match between system and real world (#2)      │
│                                                              │
│  ── Action Taken ───────────────────────────────────────     │
│  📝 Typed "My Workspace" into the workspace name field       │
│  Confidence: 0.3 (low)                                       │
│  Emotional state: confused → hesitant                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Screen 7: Heatmap View

```
┌──────────────────────────────────────────────────────────────┐
│  🪞 Mirror  >  Results  >  Heatmap              [← Back]    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Page: /signup    [Homepage ▾] [/signup] [/onboarding]       │
│  Showing: Click density across all 5 personas                │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │    ┌─────────────────────────────────┐                 │  │
│  │    │  [my-saas.com/signup]           │                 │  │
│  │    │                                 │                 │  │
│  │    │   🔴🔴🔴  (5 clicks - email)    │                 │  │
│  │    │   🟡🟡🟡  (3 clicks - workspace)│                 │  │
│  │    │   🔴🔴🔴🔴 (5 clicks - submit)  │                 │  │
│  │    │                                 │                 │  │
│  │    │              🟢 (1 click - help) │                 │  │
│  │    │                                 │                 │  │
│  │    └─────────────────────────────────┘                 │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ── Click Summary ──────────────────────────────────────     │
│  • Email field: 5/5 personas clicked (expected)              │
│  • Submit button: 5/5 personas clicked (expected)            │
│  • Workspace field: 3/5 personas hesitated before clicking   │
│  • Help link: 1/5 personas found and clicked                 │
│  • Social login: 0/5 personas used (below fold?)             │
│                                                              │
│  🔍 Insight: Social login buttons are not visible without     │
│  scrolling. 0% of personas discovered them.                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Screen 8: Custom Persona Builder

```
┌──────────────────────────────────────────────────────────────┐
│  🪞 Mirror  >  Custom Persona Builder           [Cancel]    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ── Quick Setup ─────────────────────────────────────────    │
│                                                              │
│  Describe your persona in plain text:                        │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ A 55-year-old small business owner who isn't very    │    │
│  │ tech savvy but needs to set up an online store.      │    │
│  │ She's used to physical retail and finds most         │    │
│  │ software confusing. English is her second language.  │    │
│  └──────────────────────────────────────────────────────┘    │
│  [Generate Persona →]                                        │
│                                                              │
│  ── OR Fine-Tune Manually ──────────────────────────────     │
│                                                              │
│  Name: [Maria Santos          ]  Age: [55 ]                  │
│  Occupation: [Small business owner    ]                      │
│                                                              │
│  Tech Literacy     [●○○] Low    [○●○] Med   [○○●] High      │
│  Patience Level    [●○○] Low    [○●○] Med   [○○●] High      │
│  Reading Speed     [Skims ▾]                                 │
│  Trust Level       [Skeptical ▾]                             │
│                                                              │
│  Accessibility Needs:                                        │
│  [ ] Low vision  [ ] Color blind  [ ] Motor impairment       │
│  [✓] Non-native English  [ ] Dyslexia  [ ] ADHD             │
│                                                              │
│  Frustration Triggers:                                       │
│  [✓] Too many form fields  [✓] Jargon/technical terms        │
│  [ ] Slow loading          [ ] Pop-ups                       │
│  [✓] No clear next step    [ ] Required account creation     │
│                                                              │
│  Goal: [Set up an online store for her boutique      ]       │
│                                                              │
│  ── Preview ─────────────────────────────────────────────    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ 👤 Maria Santos, 55                                  │    │
│  │ Small business owner | Low tech literacy             │    │
│  │ "I just want to get my store online without having   │    │
│  │  to learn a whole new system."                       │    │
│  │ Triggers: jargon, long forms, unclear navigation     │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│                                      [Save Persona]          │
└──────────────────────────────────────────────────────────────┘
```

---

## 11. Data Model

### Core Entities

```sql
-- A usability study
CREATE TABLE studies (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  starting_path TEXT DEFAULT '/',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT CHECK(status IN ('setup', 'running', 'analyzing', 'complete', 'failed')),
  overall_score INTEGER,  -- 0-100
  executive_summary TEXT
);

-- Tasks assigned to personas in a study
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  study_id TEXT REFERENCES studies(id),
  description TEXT NOT NULL,
  order_index INTEGER NOT NULL
);

-- AI personas used in a study
CREATE TABLE personas (
  id TEXT PRIMARY KEY,
  study_id TEXT REFERENCES studies(id),
  template_id TEXT,  -- null if custom
  profile JSON NOT NULL,  -- full PersonaProfile
  is_custom BOOLEAN DEFAULT FALSE
);

-- A navigation session (one persona attempting one task)
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  study_id TEXT REFERENCES studies(id),
  persona_id TEXT REFERENCES personas(id),
  task_id TEXT REFERENCES tasks(id),
  status TEXT CHECK(status IN ('pending', 'running', 'complete', 'failed', 'gave_up')),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  total_steps INTEGER,
  task_completed BOOLEAN,
  summary TEXT,
  emotional_arc JSON  -- [{step: 1, state: "curious"}, ...]
);

-- Individual navigation steps within a session
CREATE TABLE steps (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES sessions(id),
  step_number INTEGER NOT NULL,
  page_url TEXT NOT NULL,
  page_title TEXT,
  screenshot_path TEXT NOT NULL,
  accessibility_tree TEXT,
  think_aloud TEXT,
  action_type TEXT CHECK(action_type IN ('click', 'type', 'scroll', 'navigate', 'wait', 'give_up', 'done')),
  action_selector TEXT,
  action_value TEXT,
  action_reason TEXT,
  confidence REAL,  -- 0.0-1.0
  task_progress INTEGER,  -- 0-100
  emotional_state TEXT,
  click_x INTEGER,  -- for heatmap
  click_y INTEGER,
  viewport_width INTEGER,
  viewport_height INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- UX issues detected at each step
CREATE TABLE issues (
  id TEXT PRIMARY KEY,
  step_id TEXT REFERENCES steps(id),
  session_id TEXT REFERENCES sessions(id),
  study_id TEXT REFERENCES studies(id),
  element TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT CHECK(severity IN ('critical', 'major', 'minor', 'enhancement')),
  heuristic TEXT,  -- Nielsen heuristic
  wcag_criterion TEXT,
  recommendation TEXT,
  page_url TEXT,
  location TEXT  -- region of the page
);

-- Synthesized insights (cross-persona)
CREATE TABLE insights (
  id TEXT PRIMARY KEY,
  study_id TEXT REFERENCES studies(id),
  type TEXT CHECK(type IN ('universal', 'persona_specific', 'comparative', 'recommendation')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT,
  impact TEXT CHECK(impact IN ('high', 'medium', 'low')),
  effort TEXT CHECK(effort IN ('high', 'medium', 'low')),
  personas_affected JSON,  -- ["persona_id_1", ...]
  evidence JSON,  -- [{session_id, step_number, screenshot_path}, ...]
  rank INTEGER  -- priority ranking
);

-- Pre-built persona templates
CREATE TABLE persona_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT,
  short_description TEXT,
  default_profile JSON NOT NULL
);
```

### File Storage Structure

```
data/
├── studies/
│   └── {study_id}/
│       ├── study.json          # study metadata
│       ├── sessions/
│       │   └── {session_id}/
│       │       ├── session.json
│       │       └── steps/
│       │           ├── step_001.png    # screenshot
│       │           ├── step_001.json   # step data
│       │           ├── step_002.png
│       │           ├── step_002.json
│       │           └── ...
│       ├── heatmaps/
│       │   ├── homepage.png
│       │   ├── signup.png
│       │   └── ...
│       ├── analysis.json       # cross-persona synthesis
│       └── report.pdf          # generated report
```

---

## 12. API Design

### REST Endpoints

```
POST   /api/studies                    Create a new study
GET    /api/studies                    List all studies
GET    /api/studies/:id                Get study details + results
DELETE /api/studies/:id                Delete a study

POST   /api/studies/:id/run            Start running the study
GET    /api/studies/:id/status          Get study progress (polling)

GET    /api/studies/:id/sessions        List all sessions in a study
GET    /api/sessions/:id                Get session details
GET    /api/sessions/:id/steps          Get all steps in a session
GET    /api/sessions/:id/steps/:n       Get a specific step

GET    /api/studies/:id/issues          Get all issues (filterable)
GET    /api/studies/:id/insights        Get synthesized insights
GET    /api/studies/:id/heatmap/:page   Get heatmap data for a page

GET    /api/studies/:id/report          Download PDF report
GET    /api/studies/:id/report/markdown  Download Markdown report

GET    /api/personas/templates          List pre-built templates
POST   /api/personas/generate           Generate persona from description

GET    /api/screenshots/:path           Serve screenshot images
```

### WebSocket Events (Real-time Progress)

```
// Client → Server
{ "type": "subscribe", "study_id": "..." }

// Server → Client
{ "type": "study_progress", "study_id": "...", "percent": 45 }
{ "type": "session_update", "session_id": "...", "persona_name": "...",
  "step": 8, "think_aloud": "...", "screenshot_url": "...",
  "emotional_state": "confused" }
{ "type": "session_complete", "session_id": "...", "completed": true }
{ "type": "study_complete", "study_id": "...", "score": 72 }
```

---

## 13. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Next.js 15 (App Router) + TypeScript | Fast setup, SSR for SEO, great DX |
| **UI Components** | Tailwind CSS + shadcn/ui | Beautiful, accessible components out of the box |
| **State Management** | Zustand + React Query | Simple, lightweight, great for real-time data |
| **Charts/Viz** | Recharts + custom canvas heatmap | Recharts for dashboards, canvas for click heatmaps |
| **Backend** | FastAPI (Python) | Best async support, native Playwright compatibility |
| **Browser Automation** | Playwright (Python) | Cross-browser, best screenshot API, Microsoft MCP |
| **AI/LLM** | Anthropic Python SDK (claude-opus-4-6) | Vision + reasoning for navigation & analysis |
| **Database** | SQLite (via SQLAlchemy) | Zero config, perfect for hackathon, fast enough |
| **File Storage** | Local filesystem | Screenshots stored on disk, served by FastAPI |
| **WebSocket** | FastAPI WebSocket | Real-time study progress |
| **PDF Export** | WeasyPrint or Playwright PDF | Generate polished reports |
| **Deployment** | Docker Compose | One-command local setup |

### Why Python Backend (Not Node.js)?

1. Playwright Python + Anthropic Python SDK = tightest integration
2. asyncio for concurrent persona sessions
3. NumPy/Pillow for heatmap generation
4. WeasyPrint for PDF generation
5. browser-use library (78K stars) is Python

---

## 14. Repo Structure

```
mirror/
├── README.md
├── LICENSE (MIT)
├── docker-compose.yml
├── .env.example
│
├── backend/
│   ├── pyproject.toml
│   ├── requirements.txt
│   │
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                # FastAPI app entry
│   │   ├── config.py              # Environment config
│   │   │
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── studies.py          # Study CRUD + run endpoints
│   │   │   ├── sessions.py         # Session endpoints
│   │   │   ├── personas.py         # Persona template + generation
│   │   │   ├── reports.py          # Report generation + export
│   │   │   └── websocket.py        # Real-time progress
│   │   │
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── orchestrator.py     # Study orchestrator (parallel sessions)
│   │   │   ├── navigator.py        # Navigation agent loop
│   │   │   ├── analyzer.py         # Screenshot UX analyzer
│   │   │   ├── synthesizer.py      # Cross-persona insight synthesis
│   │   │   ├── persona_engine.py   # Persona generation + behavior
│   │   │   ├── heatmap.py          # Click heatmap generation
│   │   │   └── report_builder.py   # PDF/Markdown report generation
│   │   │
│   │   ├── browser/
│   │   │   ├── __init__.py
│   │   │   ├── pool.py             # Playwright browser pool management
│   │   │   ├── actions.py          # Click, type, scroll, navigate
│   │   │   └── screenshots.py      # Screenshot capture + annotation
│   │   │
│   │   ├── llm/
│   │   │   ├── __init__.py
│   │   │   ├── client.py           # Anthropic API client wrapper
│   │   │   ├── prompts.py          # All system prompts
│   │   │   └── schemas.py          # Pydantic models for LLM responses
│   │   │
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── database.py         # SQLAlchemy setup
│   │   │   ├── study.py            # Study model
│   │   │   ├── session.py          # Session model
│   │   │   ├── step.py             # Step model
│   │   │   ├── issue.py            # Issue model
│   │   │   └── insight.py          # Insight model
│   │   │
│   │   └── data/
│   │       ├── persona_templates.json  # Pre-built persona templates
│   │       └── heuristics.json         # Nielsen's heuristics reference
│   │
│   └── tests/
│       ├── test_navigator.py
│       ├── test_analyzer.py
│       └── test_orchestrator.py
│
├── frontend/
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   │
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx               # Landing / Dashboard
│   │   │   ├── study/
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx       # Study setup wizard
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx       # Results dashboard
│   │   │   │       ├── running/
│   │   │   │       │   └── page.tsx   # Live progress view
│   │   │   │       ├── session/
│   │   │   │       │   └── [sessionId]/
│   │   │   │       │       └── page.tsx  # Session replay
│   │   │   │       ├── heatmap/
│   │   │   │       │   └── page.tsx   # Heatmap view
│   │   │   │       └── report/
│   │   │   │           └── page.tsx   # Report preview
│   │   │   └── personas/
│   │   │       ├── page.tsx           # Persona library
│   │   │       └── builder/
│   │   │           └── page.tsx       # Custom persona builder
│   │   │
│   │   ├── components/
│   │   │   ├── ui/                    # shadcn components
│   │   │   ├── study/
│   │   │   │   ├── StudyCard.tsx
│   │   │   │   ├── StudySetupWizard.tsx
│   │   │   │   ├── TaskInput.tsx
│   │   │   │   └── StudyProgress.tsx
│   │   │   ├── persona/
│   │   │   │   ├── PersonaCard.tsx
│   │   │   │   ├── PersonaSelector.tsx
│   │   │   │   └── PersonaBuilder.tsx
│   │   │   ├── results/
│   │   │   │   ├── ScoreCard.tsx
│   │   │   │   ├── StruggleMap.tsx
│   │   │   │   ├── IssueList.tsx
│   │   │   │   ├── PersonaComparison.tsx
│   │   │   │   └── RecommendationList.tsx
│   │   │   ├── session/
│   │   │   │   ├── SessionReplay.tsx
│   │   │   │   ├── ScreenshotViewer.tsx
│   │   │   │   ├── ThinkAloudBubble.tsx
│   │   │   │   └── StepTimeline.tsx
│   │   │   ├── heatmap/
│   │   │   │   ├── ClickHeatmap.tsx
│   │   │   │   └── HeatmapOverlay.tsx
│   │   │   └── common/
│   │   │       ├── Header.tsx
│   │   │       ├── ProgressBar.tsx
│   │   │       └── ExportButton.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useStudy.ts
│   │   │   ├── useWebSocket.ts
│   │   │   └── useSessionReplay.ts
│   │   │
│   │   ├── lib/
│   │   │   ├── api.ts              # API client
│   │   │   └── types.ts            # TypeScript types
│   │   │
│   │   └── store/
│   │       └── study.ts            # Zustand store
│   │
│   └── public/
│       └── mirror-logo.svg
│
└── docs/
    ├── ARCHITECTURE.md
    └── DEMO_SCRIPT.md
```

---

## 15. 4-Week Roadmap

### Week 1: Foundation (Feb 10-16)
*Theme: "Make the core loop work"*

| Day | Backend | Frontend | Milestone |
|-----|---------|----------|-----------|
| **Mon** | Project setup: FastAPI, SQLite, Playwright install. Define data models. | Next.js + Tailwind + shadcn setup. Landing page skeleton. | Dev environment works |
| **Tue** | Persona engine: implement template system + Opus 4.6 generation. Write all persona templates. | Study setup wizard (URL input + task definition + persona selection). | Can generate personas |
| **Wed** | Navigation agent v1: single-persona Playwright loop with Opus 4.6 vision. Screenshot capture. | Basic progress view (polling, not WebSocket yet). | **CORE LOOP WORKS** — single persona navigates a site |
| **Thu** | Navigation agent v2: think-aloud narration, UX issue detection per step, emotional state tracking. | Session replay view v1 (step through screenshots). | Can watch a persona's session |
| **Fri** | Screenshot analyzer: dedicated Opus 4.6 vision pass for detailed UX audit per screenshot. | Issue list view with severity filters. | Issues detected and displayed |
| **Sat** | Parallel sessions: asyncio orchestrator runs 3-5 personas concurrently. Browser pool. | Live progress view with all personas' status. | **DEMO-ABLE PROTOTYPE** |
| **Sun** | Bug fixing, edge cases (auth walls, popups, CAPTCHAs). Error handling. | Polish study setup flow. Responsive layout. | Stable v0.1 |

**Week 1 Deliverable:** Can enter a URL + tasks, run 5 personas in parallel, see their sessions step-by-step with think-aloud narration and UX issues.

### Week 2: Intelligence (Feb 17-23)
*Theme: "Make the insights brilliant"*

| Day | Backend | Frontend | Milestone |
|-----|---------|----------|-----------|
| **Mon** | Cross-persona synthesis engine: Opus 4.6 comparative analysis. Struggle map generation. | Results dashboard v1: score cards, executive summary, struggle map. | Comparative insights work |
| **Tue** | Heatmap engine: aggregate click data per page, generate canvas overlays. | Heatmap view with page selector and click density visualization. | Heatmaps render |
| **Wed** | Report generator: PDF export with annotated screenshots, insights, recommendations. | Report preview page with export buttons (PDF + Markdown). | Reports exportable |
| **Thu** | WebSocket real-time progress: stream step updates as personas navigate. | Replace polling with WebSocket. Live screenshot preview. Live think-aloud feed. | Real-time progress feels magical |
| **Fri** | Custom persona builder API: accept text description → generate full persona via Opus 4.6. | Custom persona builder UI (text description + manual fine-tuning). | Custom personas work |
| **Sat** | Navigation quality: better action execution, retry logic, handling of dynamic content/SPAs. | Session replay polish: smooth transitions, timeline scrubber, keyboard nav. | Navigation more reliable |
| **Sun** | API error handling, rate limiting, study queue management. | Global error handling, loading states, empty states. | Stable v0.2 |

**Week 2 Deliverable:** Full feature set working — setup → run → results dashboard → session replay → heatmaps → reports → custom personas.

### Week 3: Polish & Edge Cases (Feb 24 - Mar 2)
*Theme: "Make it production-quality"*

| Day | Backend | Frontend | Milestone |
|-----|---------|----------|-----------|
| **Mon** | Authentication handling: detect login walls, cookie consent banners, handle gracefully. | Onboarding flow: first-run tutorial/tooltips. | Auth-gated sites work |
| **Tue** | SPA support: wait for client-side navigation, handle dynamic content loading. | Persona comparison table with visual diff. | SPAs navigate correctly |
| **Wed** | Mobile viewport emulation: run personas with mobile viewport sizes. | Mobile device selector in study setup. Mobile-specific heatmaps. | Mobile testing works |
| **Thu** | Prompt tuning: review all 5 stages, improve persona consistency, reduce positivity bias. | A/B comparison view: run same personas before/after a change. | Better AI output quality |
| **Fri** | Performance: optimize screenshot pipeline, batch API calls, caching. | Performance: lazy loading screenshots, virtualized lists, optimistic UI. | Sub-5-minute study completion |
| **Sat** | Docker Compose: one-command setup. Environment validation. | Docker frontend build. Production Next.js config. | `docker compose up` works |
| **Sun** | Integration testing: run against 10 diverse websites, fix edge cases. | Cross-browser frontend testing. Accessibility pass. | Tested on real sites |

**Week 3 Deliverable:** Production-quality tool that works reliably on diverse websites including SPAs, auth-gated sites, and mobile viewports.

### Week 4: Demo & Submission (Mar 3-10)
*Theme: "Make it win"*

| Day | Backend | Frontend | Milestone |
|-----|---------|----------|-----------|
| **Mon** | Competitive benchmarking: run same personas on two different URLs, compare results. (Stretch) | Comparison dashboard: side-by-side results for two URLs. (Stretch) | Competitive analysis feature |
| **Tue** | CLI mode: `mirror run https://example.com --task "Sign up"` (for devs who prefer terminal). | Final UI polish: animations, transitions, micro-interactions. | CLI works |
| **Wed** | Final bug fixes. README + documentation. License. | Landing page: explain the product, show example results. | Docs complete |
| **Thu** | Record demo: run Mirror against a well-known site, capture the entire flow. | Demo assets: example study results, sample screenshots. | Demo recorded |
| **Fri** | **DEMO VIDEO DAY 1**: Script the 3-minute demo. Record screen capture. | Edit demo video. Add voiceover/captions. | Demo v1 draft |
| **Sat** | **DEMO VIDEO DAY 2**: Polish and finalize demo video. | Prepare GitHub repo: clean history, meaningful commits, good README. | Demo finalized |
| **Sun** | **SUBMISSION**: Upload demo video, submit GitHub repo, write 100-200 word summary. | Final testing of everything. Merge all PRs. Tag v1.0. | **SUBMITTED** |

### Stretch Goals (If Ahead of Schedule)

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| S1 | **Competitive benchmarking** — compare your site vs competitor | 2 days | Very high for demo |
| S2 | **GitHub Action** — run Mirror in CI/CD on every deploy | 1 day | High for real-world impact |
| S3 | **Accessibility deep-dive** — full WCAG audit mode with screen reader persona | 2 days | High for impact |
| S4 | **Claude Code Skill** — `mirror <url>` from Claude Code terminal | 1 day | High for hackathon judges |
| S5 | **Multi-language** — test with personas in different languages | 1 day | Medium |

---

## 16. Demo Strategy

### The 3-Minute Demo Script

**The Money Shot**: Watching a 68-year-old retiree persona get confused by your signup form — in real-time, with annotated screenshots and think-aloud narration.

```
[0:00-0:20] THE HOOK
"How many of you have shipped a feature and immediately gotten complaints
about usability? What if you could run a usability study in 5 minutes
for free? Meet Mirror."

[0:20-0:50] THE SETUP
- Show the Mirror dashboard
- Enter a URL (use a real, well-known website — or our own demo site)
- Define a task: "Sign up and create your first project"
- Select 5 diverse personas (show the persona cards)
- Click "Run Study"

[0:50-1:30] THE MAGIC (most important 40 seconds)
- Show the live progress screen
- 5 personas navigating simultaneously
- Live screenshot updates
- Live think-aloud bubbles:
  - 🎓 "This is straightforward, just filling in my info"
  - 👴 "What does 'workspace' mean? I don't understand..."
  - 👶 "There are so many steps, I don't know if I'm doing this right"
- Show one persona giving up in real-time
- Show the emotional state changing from "confident" to "confused" to "frustrated"

[1:30-2:15] THE RESULTS
- Dashboard appears: UX Score 72/100, 14 issues, 3/5 completed
- Show the struggle map: bottlenecks highlighted in the user flow
- Show persona comparison: "College student breezed through in 12 steps,
  while the retiree needed 22 steps and still couldn't find email verification"
- Click into session replay: step through the retiree's session
  - Show annotated screenshot with issue callout
  - Show think-aloud: "I don't know what 'workspace' means..."
  - Show the heatmap: "Notice that 0% of personas found the social login — it's below the fold"

[2:15-2:45] THE IMPACT
- Show the top 3 prioritized recommendations
- "Replace 'workspace' with 'team name' — High impact, Low effort, helps 3/5 personas"
- Show the PDF report export
- "This entire study took 4 minutes and cost about $15 in API calls.
  The same study with real users would cost $12,000 and take 6 weeks."

[2:45-3:00] THE CLOSE
"Mirror uses Claude Opus 4.6's multimodal reasoning to create AI personas
that don't just analyze your UI — they experience it. Open source, built
in a month, and ready to make usability testing accessible to every team.
Try it now at [URL]."
```

### Demo Site Strategy

Build a **purposely flawed demo website** (a simple SaaS landing page) with planted UX issues:
1. "Workspace" instead of "Team Name" in signup
2. Social login buttons below the fold
3. 7-step onboarding (too many steps)
4. Low-contrast text on one page
5. No confirmation after email verification
6. A hamburger menu with no label on desktop

This ensures the demo always produces compelling results.

---

## 17. Risk Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **AI personas are "too nice" (positivity bias)** | High | High | Explicit prompt instructions to be critical. Calibrate against real user testing data. Add "devil's advocate" mode. |
| **Navigation agent gets stuck on complex SPAs** | Medium | High | Max step limit (25). Graceful "gave up" state. Test against 10+ diverse sites. Use hybrid a11y+vision approach. |
| **Auth walls / CAPTCHAs block navigation** | Medium | Medium | Detect and report as "blocked" rather than failing silently. Pre-auth cookie injection option. Use demo site that doesn't have auth. |
| **Opus 4.6 API rate limits** | Low | High | Queue system with backoff. Option to use Sonnet 4.5 for navigation (Opus for synthesis). Batch analysis calls. |
| **Screenshot analysis is too slow** | Medium | Medium | Parallelize analysis with navigation. Use Sonnet 4.5 for per-step analysis, Opus for synthesis. JPEG compression. |
| **5 parallel browsers crash** | Low | Medium | Browser pool with restart logic. Limit to 3 concurrent if needed. Headless mode. |
| **Generated personas feel robotic** | Medium | High | Rich persona profiles with personality quirks. Review and iterate on persona generation prompt. Use real UX research personas as reference. |
| **Heatmap data is too sparse** | Medium | Low | Aggregate across multiple runs. Use scroll depth + hover as additional signals. |
| **Frontend demo doesn't look polished** | Low | High | Use shadcn/ui for consistent design. Focus on 2-3 screens being perfect rather than all screens. |
| **Demo website doesn't trigger interesting issues** | Low | Very High | Pre-test the demo site with Mirror. Plant 5+ diverse UX issues. Record backup demo in advance. |

---

## 18. Hackathon Scoring Optimization

### Demo (30% weight)
- **Strategy**: The "live personas navigating" screen is inherently compelling. It's like watching a user test unfold in fast-forward.
- **Money shot**: A persona getting confused, expressing frustration in think-aloud, and eventually giving up.
- **Wow factor**: Side-by-side comparison of how a college student vs. a retiree experienced the same page.

### Opus 4.6 Use (25% weight)
- **5 distinct pipeline stages** all using Opus 4.6 (not just a single API call)
- **Multimodal (vision)** — analyzing screenshots is a flagship Opus 4.6 capability
- **Deep reasoning** — persona role-playing requires nuanced understanding of human behavior
- **Multi-agent** — 5 personas running simultaneously = 5 concurrent Opus 4.6 agent loops
- **Structured output** — JSON schemas for every LLM response
- **Synthesis** — cross-persona comparative analysis is a hard reasoning task

### Impact (25% weight)
- **$12K → $15 cost reduction** for usability testing (800x cheaper)
- **6 weeks → 5 minutes** time reduction (8,640x faster)
- **Democratizes UX testing** for indie devs and startups who could never afford it
- **Accessibility impact** — screen reader persona highlights a11y issues
- **Measurable** — can show before/after of fixing Mirror-identified issues

### Depth & Execution (20% weight)
- **Full pipeline** — not just one API call, but a multi-stage system
- **Real browser automation** — not a mockup, actual Playwright navigation
- **Polished UI** — dashboard, session replay, heatmaps, reports
- **Open source** — clean repo, good docs, MIT license
- **Edge case handling** — SPAs, auth walls, dynamic content

### Special Prize Targets

**"Most Creative Opus 4.6 Exploration" ($5K)**
- Using Opus 4.6 to role-play as different human personas is a novel use case
- Multimodal (vision) + structured reasoning + personality simulation = creative combination

**"Keep Thinking" Prize ($5K)**
- Extended thinking / chain-of-thought is ideal for the navigation decision loop
- Each step requires reasoning about: "What would this specific persona do next?"

---

## 19. Submission Draft

### Summary (100-200 words)

**Mirror — AI User Testing Platform**

Mirror creates realistic AI personas and has them navigate your live website using real browser automation, generating actionable UX insights in minutes instead of weeks.

Traditional usability testing costs $12,000+ and takes 4-10 weeks. Mirror delivers comparable insights in under 5 minutes for pennies. Each AI persona — from a tech-savvy college student to a 68-year-old retiree — actually clicks, scrolls, and fills forms on your deployed site using Playwright. Claude Opus 4.6's multimodal vision analyzes every screenshot for usability issues while personas provide genuine think-aloud narration.

The result: a comprehensive UX report with persona comparisons, struggle maps, click heatmaps, severity-ranked issues, and prioritized fix recommendations — all generated by AI that doesn't just analyze your interface, but experiences it.

Built on a 5-stage Opus 4.6 pipeline (persona generation → navigation decision-making → screenshot analysis → cross-persona synthesis → report generation), Mirror demonstrates creative use of multimodal reasoning, multi-agent orchestration, and persona simulation.

Open source. Built to make usability testing accessible to every developer.

---

## Appendix A: Nielsen's 10 Usability Heuristics (Reference)

Used in issue classification throughout the pipeline:

1. **Visibility of system status** — Keep users informed about what's happening
2. **Match between system and real world** — Use familiar language and concepts
3. **User control and freedom** — Provide undo/redo, clear exits
4. **Consistency and standards** — Follow platform conventions
5. **Error prevention** — Design to prevent problems before they occur
6. **Recognition rather than recall** — Make objects/actions visible
7. **Flexibility and efficiency of use** — Support both novice and expert users
8. **Aesthetic and minimalist design** — Remove irrelevant information
9. **Help users recognize, diagnose, and recover from errors** — Clear error messages
10. **Help and documentation** — Provide searchable, task-focused help

---

## Appendix B: Competitive Cost Comparison

```
┌─────────────────────────────────────────────────────────────┐
│                    COST PER USABILITY STUDY                  │
│                                                             │
│  UserTesting (5 users):          $$$$$$$$$$$  ~$3,000+      │
│  Moderated study (5 users):      $$$$$$$$$$$$$$  ~$12,000   │
│  Agency study (15 users):        $$$$$$$$$$$$$$$$$$  ~$30K  │
│  Mirror (5 AI personas):         $  ~$15                    │
│                                                             │
│                    TIME PER STUDY                            │
│                                                             │
│  UserTesting:                    ████████  ~1-2 weeks       │
│  Moderated study:                ████████████████  ~4-10 wks│
│  Agency study:                   ████████████████████  ~8 wk│
│  Mirror:                         ▎  ~5 minutes              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Appendix C: Example Persona Navigation Transcript

```
Study: my-saas.com | Persona: Margaret (68, Retiree, Low Tech Literacy)
Task: "Sign up for a free account and create your first project"

Step 1: [Homepage]
  Think: "Oh, this is a nice looking website. Let me read what it does."
  Action: Scroll down slowly
  Emotion: curious
  Issues: None

Step 2: [Homepage - scrolled]
  Think: "I see 'Get Started Free' — I'll click that."
  Action: Click "Get Started Free" button
  Emotion: confident
  Issues: None

Step 3: [Signup Page]
  Think: "Okay, they want my email and a password. That's normal."
  Action: Type email in email field
  Emotion: confident
  Issues: None

Step 4: [Signup Page]
  Think: "Now the password. It says it needs 8 characters with a number.
         Let me think of something..."
  Action: Type password
  Emotion: slightly frustrated
  Issues:
    - MINOR: Password requirements shown only after failed attempt
      Heuristic: #1 (Visibility of system status)

Step 5: [Signup Page]
  Think: "What's a 'workspace name'? Is that like my company? I don't
         have a company. I'll just put my name..."
  Action: Type "Margaret's Space" in workspace field
  Emotion: confused
  Issues:
    - MAJOR: "Workspace" is jargon. Non-technical users don't understand
      this term. Should say "Team Name" or "Account Name"
      Heuristic: #2 (Match between system and real world)

Step 6: [Signup Page]
  Think: "Oh there are more fields below. Phone number? I don't want to
         give my phone number to a website I just found."
  Action: Leave phone number blank, scroll to find submit button
  Emotion: skeptical
  Issues:
    - MINOR: Asking for phone during signup adds friction and raises
      privacy concerns. Should be optional or removed.
      Heuristic: #8 (Aesthetic and minimalist design)

...

Step 22: [Create Project Page]
  Think: "I finally found where to make a project. That took much longer
         than I expected. I almost gave up at the email verification part."
  Action: Click "Create Project"
  Emotion: relieved
  Issues: None

SESSION SUMMARY:
  Completed: Yes (after 22 steps, with difficulty)
  Top issues: Workspace jargon, unclear email verification, too many onboarding steps
  Would recommend: "Maybe, but only if my friend helped me set it up."
  Overall UX score: 45/100 (from this persona's perspective)
```

---

*Built for the "Built with Opus 4.6" Claude Code Hackathon.*
*Problem Statement 2: Break the Barriers.*
*Mirror breaks the $12,000 barrier between product teams and usability insights.*
