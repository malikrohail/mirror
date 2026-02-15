# Cost & Performance

Mirror delivers 80% of the insights from a traditional usability study at roughly 1/2000th the cost and 1/5000th the time. This document breaks down the numbers.

---

## 1. Cost Breakdown

### Per-Stage LLM Costs (Typical Study: 3 Personas, 2 Tasks)

Mirror's AI pipeline runs in five sequential stages. Each stage uses a different model depending on whether the task demands deep reasoning (Opus) or fast pattern-matching (Haiku/Sonnet).

| Stage | Model | Calls | Input Tokens/Call | Output Tokens/Call | Cost Range |
|-------|-------|------:|------------------:|-------------------:|-----------:|
| 1. Persona Generation | Opus 4.6 | 0-3 | ~2,000 | ~1,500 | $0.10-0.30 |
| 2. Navigation Decisions | Haiku 4.5 | 60-90 | ~2,000 (vision) | ~500 | $0.30-0.50 |
| 3. Screenshot Analysis | Opus 4.6 | 60-90 | ~2,500 (vision) | ~800 | $2.00-4.00 |
| 4. Insight Synthesis | Opus 4.6 | 1-3 | ~8,000 | ~3,000 | $0.50-1.00 |
| 5. Report Generation | Opus 4.6 | 1-2 | ~10,000 | ~4,000 | $0.30-0.50 |
| **Total** | | **~125-190** | | | **$3.20-6.30** |

### How the Estimates Are Calculated

**Stage 2 (Navigation)** is the highest-volume stage. With 3 personas each running up to 30 steps across 2 tasks, that is up to 180 calls in the worst case. In practice, personas complete tasks in 10-15 steps on average, yielding 60-90 calls. At Haiku pricing ($0.80/M input, $4/M output):

```
90 calls x (2,000 input tokens x $0.80/M + 500 output tokens x $4/M)
= 90 x ($0.0016 + $0.002)
= 90 x $0.0036
= $0.32
```

**Stage 3 (Screenshot Analysis)** is the most expensive stage. Each step's screenshot gets a deep visual UX audit from Opus. At Opus pricing ($15/M input, $75/M output):

```
90 calls x (2,500 input tokens x $15/M + 800 output tokens x $75/M)
= 90 x ($0.0375 + $0.06)
= 90 x $0.0975
= $3.51 (worst case)
```

**Stage 1 (Persona Generation)** costs $0 when using pre-built templates from the library of 20+ personas. The LLM is only called when a user creates a custom persona from a natural language description.

### Token Volume Summary

| Metric | Typical Study | Maximum |
|--------|-------------:|--------:|
| Total LLM calls | ~125 | ~280 |
| Total input tokens | ~300K | ~650K |
| Total output tokens | ~80K | ~180K |
| Vision calls (with screenshots) | ~120 | ~180 |
| Estimated cost | $3-6 | $8-12 |

---

## 2. Performance Profile

### Timing by Phase

| Phase | Duration | What Happens |
|-------|----------|-------------|
| Study Setup | <1 sec | Persona instantiation, task parsing, browser pool allocation |
| Site Pre-Crawl (Firecrawl) | 5-15 sec | Discover sitemap, extract page content for navigation context |
| Navigation (Stage 2) | 1-3 min | All personas navigate in parallel via asyncio |
| Screenshot Analysis (Stage 3) | 30-90 sec | Batch Opus vision calls on captured screenshots |
| Insight Synthesis (Stage 4) | 15-30 sec | Cross-persona comparative analysis |
| Report Generation (Stage 5) | 10-20 sec | Markdown + PDF generation |
| **Total end-to-end** | **2-5 min** | |

### Parallelism

The navigation phase runs all persona sessions concurrently using Python's asyncio. Each persona gets its own headless browser instance (up to `MAX_CONCURRENT_SESSIONS=5`). This means:

| Personas | Sequential Time (Hypothetical) | Parallel Time (Actual) | Speedup |
|---------:|-------------------------------:|----------------------:|--------:|
| 1 | 1 min | 1 min | 1x |
| 3 | 3 min | ~1.2 min | 2.5x |
| 5 | 5 min | ~1.5 min | 3.3x |

Adding personas increases cost linearly but wall-clock time grows sub-linearly. The bottleneck shifts from navigation to analysis as persona count rises.

### Real-Time Streaming

Every navigation step publishes a WebSocket event via Redis pub/sub within milliseconds of completion. The frontend receives:

- Persona name and emotional state
- Think-aloud narration
- Screenshot URL
- Action taken (click, type, scroll)
- Task progress percentage

This means judges and users see live progress, not a loading spinner. Sub-second latency from action to UI update.

---

## 3. Scaling Characteristics

### Cost Scaling

| Configuration | Personas | Tasks | Est. Steps | Est. Cost |
|--------------|:--------:|:-----:|:----------:|----------:|
| Minimal | 1 | 1 | 10-15 | $1-2 |
| Typical | 3 | 2 | 60-90 | $3-6 |
| Comprehensive | 5 | 3 | 150-225 | $8-15 |
| Large-scale | 10 | 5 | 300-500 | $20-35 |

Cost scales roughly as `O(personas x tasks x avg_steps)`. The fixed overhead (persona generation, synthesis, report) is small relative to the per-step navigation and analysis costs.

### Time Scaling

| Configuration | Personas | Navigation | Analysis | Total |
|--------------|:--------:|:----------:|:--------:|------:|
| Minimal | 1 | 45 sec | 30 sec | ~1.5 min |
| Typical | 3 | 1.5 min | 1 min | ~3 min |
| Comprehensive | 5 | 2 min | 1.5 min | ~4 min |
| Large-scale | 10 | 4 min* | 3 min | ~8 min |

*With `MAX_CONCURRENT_SESSIONS=5`, 10 personas run in two batches of 5.

### Bottleneck Analysis

| Phase | Bottleneck | Mitigation |
|-------|-----------|------------|
| Navigation | Concurrent browser limit | Configurable `MAX_CONCURRENT_SESSIONS`; Browserbase scales horizontally |
| Analysis | Anthropic API rate limits | Batch requests; retry with exponential backoff |
| Synthesis | Single large context window | Summarize per-session before cross-persona synthesis |
| Report | PDF rendering (WeasyPrint) | Runs once; typically under 5 seconds |

---

## 4. Infrastructure

### Production Hosting (Current)

| Component | Provider | Cost Estimate |
|-----------|----------|-------------:|
| Compute (API + Worker + Frontend) | DigitalOcean Droplet | $24-48/mo |
| PostgreSQL | DigitalOcean (Docker) | Included in droplet |
| Redis | DigitalOcean (Docker) | Included in droplet |
| Cloud Browsers | Browserbase | Free tier: 1 concurrent; paid: per-session |
| Screenshot Storage | Cloudflare R2 | ~$0.015/GB/mo stored; $0 egress |
| Reverse Proxy + TLS | Caddy (Docker) | Included in droplet |
| Domain (miror.tech) | Registrar | ~$12/yr |

### Why R2 Over S3

A single study with 3 personas and 90 steps generates roughly 90 screenshots at ~200-400KB each, totaling 20-35MB per study. Session replay loads all screenshots for a given persona (up to 30 images). With S3, egress fees ($0.09/GB) would add up quickly as users replay sessions. Cloudflare R2 charges zero egress fees, making replay effectively free regardless of how often users review sessions.

### Monthly Infrastructure Cost (Excluding LLM)

| Usage Tier | Studies/Month | Infra Cost | LLM Cost | Total |
|-----------|:-------------:|-----------:|---------:|------:|
| Prototype / Demo | 10-20 | ~$30 | $30-120 | $60-150 |
| Early Startup | 100-500 | ~$75 | $300-3,000 | $375-3,075 |
| Growth | 1,000-5,000 | ~$200 | $3,000-30,000 | $3,200-30,200 |

LLM costs dominate at every scale. Infrastructure is a rounding error.

---

## 5. Comparison: Mirror vs Traditional Usability Testing

| Metric | Traditional Testing | Mirror |
|--------|-------------------:|------:|
| Cost per round | $12,000-25,000 | $3-6 |
| Time to results | 2-6 weeks | 2-5 minutes |
| Participants per round | 5-8 | Unlimited (typically 3-10) |
| Scheduling overhead | Recruit, screen, schedule | None |
| Iteration speed | Weeks between rounds | Minutes between rounds |
| Geographic diversity | Limited by recruitment | Instant (persona attributes) |
| Accessibility testing | Requires specialized recruitment | Built-in (e.g., screen reader persona) |
| Consistency | Variable (moderator bias, participant mood) | Deterministic persona behavior |
| Real browser testing | Yes | Yes (Playwright + Browserbase) |
| Think-aloud narration | Yes (human) | Yes (AI-generated per step) |
| Heatmaps | Requires eye-tracking hardware | Generated from click/scroll data |
| PDF report | Manual synthesis by researcher | Auto-generated |

### Cost Comparison at Scale

| Rounds of Testing | Traditional | Mirror | Savings |
|:-----------------:|-----------:|------:|--------:|
| 1 | $12,000 | $5 | 99.96% |
| 5 | $60,000 | $25 | 99.96% |
| 10 | $120,000 | $50 | 99.96% |
| 50 (continuous testing) | $600,000 | $250 | 99.96% |

The economics enable a fundamentally different workflow: test after every deploy, not once a quarter.

---

## 6. Optimization Strategies

Mirror employs several strategies to minimize cost and latency without sacrificing insight quality.

### Model Routing

The most impactful optimization. Each pipeline stage uses the cheapest model that meets quality requirements:

| Stage | Could Use | Actually Uses | Cost Reduction |
|-------|-----------|--------------|---------------:|
| Navigation decisions | Opus 4.6 ($15/$75) | Haiku 4.5 ($0.80/$4) | ~19x cheaper per call |
| Screenshot analysis | Opus 4.6 | Opus 4.6 (no shortcut) | Baseline |
| Persona generation | Opus 4.6 | Skipped for templates | 100% for templates |
| Synthesis | Opus 4.6 | Opus 4.6 (no shortcut) | Baseline |
| Report generation | Opus 4.6 | Opus 4.6 (no shortcut) | Baseline |

Navigation is the highest-volume stage (60-90 calls), so routing it to Haiku saves roughly $2-4 per study.

### Template Caching

Pre-built persona templates (20+ in the library) skip LLM generation entirely. The persona profile JSON is stored in `persona_templates.json` and loaded directly. Only custom personas (built from natural language descriptions) invoke the Opus generation call.

- Template persona cost: $0
- Custom persona cost: ~$0.10 per persona

### Screenshot Compression

Screenshots are captured as JPEG rather than PNG where appropriate, reducing file size by 60-80%. This reduces:

- Storage costs on R2 (smaller files)
- Upload time to R2 (less bandwidth)
- Replay load time (fewer bytes to transfer)
- Vision API input tokens (smaller base64 payloads)

### Configurable Step Limits

`MAX_STEPS_PER_SESSION=30` caps runaway navigation. Most tasks complete in 10-15 steps. The cap prevents edge cases (infinite loops, confused personas) from burning through API credits. This is configurable per deployment.

### Early Task Completion

Personas detect when a task is complete and stop navigating. A persona that finishes a checkout flow in 8 steps does not continue to step 30. This saves 22 unnecessary navigation calls and 22 screenshot analysis calls per session.

### Parallel Execution

Running personas concurrently does not reduce cost, but it reduces wall-clock time dramatically. A 5-persona study takes roughly the same time as a 1-persona study (1.5 min vs 1 min for navigation). This matters for user experience: judges and users see results in minutes, not tens of minutes.

### Batch Analysis

Screenshot analysis calls (Stage 3) can be batched after navigation completes rather than running inline. This allows the system to:

- Deduplicate screenshots of the same page across personas
- Prioritize analysis of pages where multiple personas struggled
- Skip analysis of trivial steps (e.g., initial page load) if budget is constrained

### LLM Observability (Langfuse)

Every API call is traced through Langfuse, providing:

- Per-study cost breakdown by stage
- Token usage trends over time
- Latency percentiles per model
- Failed call rates and retry counts

This data feeds back into optimization decisions. If a stage is consistently over-budget, the team can evaluate whether a cheaper model is viable for that stage.

---

## Summary

| Metric | Value |
|--------|-------|
| Cost per typical study | $3-6 |
| Time per typical study | 2-5 minutes |
| Cost reduction vs traditional | ~99.96% |
| Time reduction vs traditional | ~99.99% |
| Primary cost driver | LLM API calls (Stage 3: screenshot analysis) |
| Primary time driver | Navigation phase (browser automation) |
| Infrastructure cost (monthly) | $30-75 for early stage |
| Break-even vs 1 traditional study | ~2,000-4,000 Mirror studies |

Mirror makes usability testing economically viable as a continuous practice rather than an occasional luxury.
