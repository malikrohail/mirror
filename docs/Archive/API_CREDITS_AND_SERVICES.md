# Mirror — API Credits & Services Budget

**Team Budget: $100K**
**Timeline: 3 months (Feb–May 2026)**

---

## TIER 1: ESSENTIAL (Cannot ship without these)

### 1. Anthropic API — Claude Opus 4.6 + Sonnet 4.5
- **What for:** THE core of Mirror. All 5 AI pipeline stages — persona generation, navigation decisions, screenshot analysis, insight synthesis, report generation
- **Why:** Opus 4.6 for deep reasoning + vision. Sonnet 4.5 for cost-optimized navigation steps
- **Estimated cost (3 months):**
  - Development/testing: ~500 studies × $15/study = **$7,500**
  - Demo runs + rehearsals: ~100 studies × $15 = **$1,500**
  - Buffer for prompt iteration (lots of wasted tokens while tuning): **$3,000**
  - **Total: ~$12,000**
- **Sign up:** https://console.anthropic.com
- **Env var:** `ANTHROPIC_API_KEY`
- **Tip:** Request higher rate limits early. Default is 4K requests/min for Opus which should be fine, but if you're running 10+ parallel personas you'll be making many concurrent calls.

### 2. Browserbase — Managed Cloud Browsers
- **What for:** Instead of running Playwright locally (crashes, memory issues, scaling problems), Browserbase gives you managed headless Chromium instances in the cloud. You still write Playwright code — you just connect it to their cloud browsers instead of local ones.
- **Why this over local Playwright:**
  - No "5 Chrome instances crashed my laptop" problems
  - Built-in session recording and replay (free feature we'd otherwise have to build)
  - Proxy rotation for geo-testing (test from different countries)
  - Stealth mode (avoids bot detection on sites that block headless browsers)
  - Scales to 50+ concurrent sessions without infrastructure work
  - Their Stagehand SDK can augment our navigation with AI-powered element selection as a fallback
- **Estimated cost:**
  - Starter plan: free (100 sessions/month)
  - Scale plan: $200/month → **$600 for 3 months**
  - If heavy usage: $500/month → **$1,500**
  - **Total: ~$600–$1,500**
- **Sign up:** https://www.browserbase.com
- **Env var:** `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID`
- **Integration:** Replace local Playwright with Browserbase connection:
  ```python
  from playwright.async_api import async_playwright

  async with async_playwright() as p:
      browser = await p.chromium.connect_over_cdp(
          f"wss://connect.browserbase.com?apiKey={BROWSERBASE_API_KEY}"
      )
  ```

### 3. PostgreSQL (Managed) — Neon or Supabase
- **What for:** Primary database for all study data, sessions, issues, insights
- **Options:**
  - **Neon** (recommended): Serverless Postgres, generous free tier (0.5 GB), scales automatically, branching for dev/staging
  - **Supabase**: Postgres + auth + storage + realtime. More features but heavier
- **Estimated cost:**
  - Neon free tier covers dev. Pro plan $19/month for production → **$57**
  - Supabase free tier covers dev. Pro plan $25/month → **$75**
  - **Total: ~$60–$75**
- **Sign up:** https://neon.tech or https://supabase.com
- **Env var:** `DATABASE_URL`
- **Tip:** Neon is simpler for just Postgres. Supabase if you want their auth + storage too.

### 4. Redis (Managed) — Upstash
- **What for:** Job queue (arq), WebSocket pub/sub, caching, rate limiting
- **Why Upstash:** Serverless Redis, pay-per-request, generous free tier (10K commands/day), no server to manage
- **Estimated cost:**
  - Free tier covers development
  - Pay-as-you-go: ~$10-30/month → **$30–$90**
  - **Total: ~$30–$90**
- **Sign up:** https://upstash.com
- **Env var:** `REDIS_URL`

### 5. Vercel — Frontend Hosting
- **What for:** Host the Next.js frontend
- **Estimated cost:**
  - Free tier (Hobby) covers everything for hackathon
  - Pro $20/month if needed → **$60**
  - **Total: $0–$60**
- **Sign up:** https://vercel.com
- **Tip:** Deploy frontend to Vercel, keep backend separate (Railway/Fly)

### 6. Railway or Render — Backend Hosting
- **What for:** Host the FastAPI backend + arq worker
- **Options:**
  - **Railway** (recommended): Simple, fast deploys, good DX. Starter plan $5/month + usage
  - **Render**: Similar, free tier available but slower cold starts
  - **Fly.io**: Good for global edge deployment
- **Estimated cost:**
  - Railway: ~$20–50/month → **$60–$150**
  - **Total: ~$60–$150**
- **Sign up:** https://railway.app
- **Tip:** Railway can also host Postgres and Redis, simplifying your infra to one platform

---

## TIER 2: STRONGLY RECOMMENDED (Significant quality/speed improvement)

### 7. Firecrawl — Web Scraping & Crawling API
- **What for:** Pre-study site crawling. Before personas start navigating, Firecrawl can:
  - Discover all pages/routes on the target site (sitemap)
  - Extract clean markdown content from each page
  - Detect site structure (nav menus, forms, CTAs)
  - This gives Mirror a "map" of the site BEFORE personas start navigating — making navigation smarter and faster
- **Why not just use Playwright for this:** Firecrawl is 10x faster for bulk crawling and returns clean structured data. Playwright is for interactive navigation. Use Firecrawl for reconnaissance, Playwright for the actual persona sessions.
- **Estimated cost:**
  - Free tier: 500 credits/month
  - Growth plan: $49/month (50K credits) → **$147**
  - **Total: ~$150**
- **Sign up:** https://www.firecrawl.dev
- **Env var:** `FIRECRAWL_API_KEY`
- **Use case example:**
  ```python
  # Before study runs, map the site
  from firecrawl import FirecrawlApp
  app = FirecrawlApp(api_key=FIRECRAWL_API_KEY)
  result = app.crawl_url("https://target-site.com", params={"limit": 50})
  # Now personas have a sitemap to reference during navigation
  ```

### 8. Cloudflare R2 — Object Storage (Screenshots)
- **What for:** Store screenshots, heatmaps, and generated reports. S3-compatible but with zero egress fees.
- **Why R2 over S3:** No egress charges. When users view session replays (lots of screenshot loading), S3 egress costs add up fast. R2 = free reads.
- **Estimated cost:**
  - Free tier: 10 GB storage, 10M reads/month (probably enough for hackathon)
  - Beyond free: $0.015/GB/month
  - **Total: $0–$20**
- **Sign up:** https://dash.cloudflare.com (R2 under Storage)
- **Env var:** `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT_URL`

### 9. Clerk — Authentication
- **What for:** User auth (sign up, sign in, team management). Handles JWT, session management, OAuth providers.
- **Why Clerk over DIY:** Saves 2-3 days of auth implementation. Beautiful pre-built UI components. Team/org management for workspaces.
- **Estimated cost:**
  - Free tier: 10K monthly active users (way more than enough)
  - **Total: $0**
- **Sign up:** https://clerk.com
- **Env var:** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`

### 10. Langfuse — LLM Observability
- **What for:** Track every Anthropic API call — token usage, cost, latency, success/failure. See exactly how much each study costs. Debug prompt issues. Essential for understanding and optimizing your AI pipeline.
- **Why:** When you're making 200+ API calls per study across 5 pipeline stages, you NEED visibility. Langfuse shows you: which prompts are expensive, which are slow, which fail.
- **Estimated cost:**
  - Free tier: 50K observations/month (enough for dev)
  - Pro: $59/month → **$177**
  - **Total: $0–$177**
- **Sign up:** https://langfuse.com
- **Env var:** `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_HOST`
- **Integration:** Wrap Anthropic client with Langfuse decorator — zero code change to existing calls

### 11. Sentry — Error Monitoring
- **What for:** Catch and track errors in both backend and frontend. When a browser session crashes or an API call fails at 2 AM, you'll know.
- **Estimated cost:**
  - Free tier: 5K errors/month (enough)
  - **Total: $0**
- **Sign up:** https://sentry.io
- **Env var:** `SENTRY_DSN`

### 12. Resend — Transactional Email
- **What for:** Send report emails, study completion notifications, weekly digest emails
- **Estimated cost:**
  - Free tier: 100 emails/day, 3K/month
  - **Total: $0**
- **Sign up:** https://resend.com
- **Env var:** `RESEND_API_KEY`

---

## TIER 3: NICE TO HAVE (Competitive edge features)

### 13. Stagehand SDK (by Browserbase) — AI Browser Automation
- **What for:** Augments Playwright with AI-powered element selection. When our persona's Opus-generated selector doesn't match any element, Stagehand can intelligently find the right element.
- **Why:** Acts as a fallback for navigation failures. When the a11y tree selector from Opus doesn't work, Stagehand's `observe()` and `act()` can find the element using natural language.
- **Cost:** Free (open source, MIT). Uses your Browserbase + Anthropic credits.
- **Sign up:** https://github.com/browserbase/stagehand
- **Integration:** Use alongside Playwright, not instead of it

### 14. Trigger.dev or Inngest — Background Job Infrastructure
- **What for:** Alternative to arq for background jobs. Better dashboard, retries, scheduling, and observability out of the box.
- **Why consider:** If arq feels too bare-bones, Trigger.dev gives you a beautiful dashboard to see all running studies, retry failed ones, and schedule recurring studies.
- **Estimated cost:**
  - Trigger.dev free tier: 1K runs/month
  - Pro: $30/month → **$90**
  - **Total: $0–$90**
- **Sign up:** https://trigger.dev

### 15. PostHog — Product Analytics
- **What for:** Track user behavior in the Mirror app itself. Which features are used? Where do users drop off in the study setup wizard? What's the most common persona selection?
- **Estimated cost:**
  - Free tier: 1M events/month
  - **Total: $0**
- **Sign up:** https://posthog.com
- **Env var:** `NEXT_PUBLIC_POSTHOG_KEY`

### 16. GitHub Actions — CI/CD
- **What for:** Run tests on every PR. Also needed for the "Mirror as GitHub Action" integration feature (let users run Mirror in their CI pipeline).
- **Cost:** Free for public repos. 2K minutes/month for private.
- **Already have:** If repo is on GitHub, you have this.

### 17. Linear — Project Management
- **What for:** Track issues and tasks for the team during development. Also needed for the "create Linear issue from Mirror finding" integration feature.
- **Cost:** Free for small teams.
- **Sign up:** https://linear.app
- **Env var (for integration):** `LINEAR_API_KEY`

### 18. Tavily — AI Search API
- **What for:** The competitive benchmarking feature. When a user says "compare my site against competitors," Tavily can find and identify competitor sites in the same space.
- **Estimated cost:**
  - Free tier: 1K searches/month
  - **Total: $0**
- **Sign up:** https://tavily.com
- **Env var:** `TAVILY_API_KEY`

---

## TIER 4: POST-HACKATHON (For when it becomes a real business)

| Service | What For | When |
|---------|---------|------|
| **Stripe** | Payment processing | When you launch paid plans |
| **AWS/GCP** | Production infrastructure at scale | When Docker Compose isn't enough |
| **Datadog** | Production monitoring + APM | When you need SLAs |
| **LaunchDarkly** | Feature flags | When you need gradual rollouts |
| **Customer.io** | Marketing automation | When you have users to nurture |
| **Intercom/Crisp** | Customer support chat | When users need help |

---

## Budget Summary

| Category | Service | 3-Month Cost | Priority |
|----------|---------|:------------:|----------|
| **AI/LLM** | Anthropic API | **$12,000** | Essential |
| **Browsers** | Browserbase | **$600–$1,500** | Essential |
| **Database** | Neon (Postgres) | **$60** | Essential |
| **Cache/Queue** | Upstash (Redis) | **$30–$90** | Essential |
| **Frontend Host** | Vercel | **$0–$60** | Essential |
| **Backend Host** | Railway | **$60–$150** | Essential |
| **Crawling** | Firecrawl | **$150** | Recommended |
| **Storage** | Cloudflare R2 | **$0–$20** | Recommended |
| **Auth** | Clerk | **$0** | Recommended |
| **LLM Observability** | Langfuse | **$0–$177** | Recommended |
| **Error Monitoring** | Sentry | **$0** | Recommended |
| **Email** | Resend | **$0** | Recommended |
| **AI Browser Fallback** | Stagehand | **$0** | Nice to have |
| **Jobs Dashboard** | Trigger.dev | **$0–$90** | Nice to have |
| **Analytics** | PostHog | **$0** | Nice to have |
| **Search** | Tavily | **$0** | Nice to have |
| | | | |
| **TOTAL** | | **$13,000–$14,300** | |
| **Buffer (2x)** | | **$28,000** | |

**Conservative estimate: ~$15K for 3 months**
**With generous buffer: ~$28K**
**Remaining from $100K: ~$72K–$85K** (team costs, domain, design assets, etc.)

---

## Environment Variables Master List

```bash
# === ESSENTIAL ===
ANTHROPIC_API_KEY=sk-ant-...                          # Claude API
BROWSERBASE_API_KEY=bb_...                            # Cloud browsers
BROWSERBASE_PROJECT_ID=proj_...                       # Browserbase project
DATABASE_URL=postgresql+asyncpg://...                 # Neon Postgres
REDIS_URL=redis://...                                 # Upstash Redis

# === RECOMMENDED ===
FIRECRAWL_API_KEY=fc-...                              # Site crawling
R2_ACCESS_KEY_ID=...                                  # Cloudflare R2 storage
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=mirror-screenshots
R2_ENDPOINT_URL=https://xxx.r2.cloudflarestorage.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...              # Auth (frontend)
CLERK_SECRET_KEY=sk_...                               # Auth (backend)
LANGFUSE_PUBLIC_KEY=pk-...                            # LLM observability
LANGFUSE_SECRET_KEY=sk-...
LANGFUSE_HOST=https://cloud.langfuse.com
SENTRY_DSN=https://...@sentry.io/...                  # Error monitoring
RESEND_API_KEY=re_...                                 # Email

# === NICE TO HAVE ===
NEXT_PUBLIC_POSTHOG_KEY=phc_...                       # Product analytics
TAVILY_API_KEY=tvly-...                               # AI search
LINEAR_API_KEY=lin_api_...                            # Linear integration

# === APP CONFIG ===
OPUS_MODEL=claude-opus-4-6
SONNET_MODEL=claude-sonnet-4-5-20250929
MAX_CONCURRENT_SESSIONS=5
MAX_STEPS_PER_SESSION=30
STUDY_TIMEOUT_SECONDS=600
STORAGE_PATH=./data
LOG_LEVEL=INFO
```

---

## Sign-Up Checklist

Go through this list and create accounts. Get API keys into a shared `.env` file (NOT committed to git).

- [ ] **Anthropic** — https://console.anthropic.com → API Keys → Create
- [ ] **Browserbase** — https://www.browserbase.com → Sign Up → Get API key + Project ID
- [ ] **Neon** — https://neon.tech → Create Project → Copy connection string
- [ ] **Upstash** — https://upstash.com → Create Redis Database → Copy URL
- [ ] **Vercel** — https://vercel.com → Import Git Repo
- [ ] **Railway** — https://railway.app → New Project
- [ ] **Firecrawl** — https://www.firecrawl.dev → Sign Up → API Keys
- [ ] **Cloudflare** — https://dash.cloudflare.com → R2 → Create Bucket
- [ ] **Clerk** — https://clerk.com → Create Application
- [ ] **Langfuse** — https://langfuse.com → Create Project → API Keys
- [ ] **Sentry** — https://sentry.io → Create Project (Python + Next.js)
- [ ] **Resend** — https://resend.com → API Keys
- [ ] **PostHog** — https://posthog.com → Create Project (optional)
- [ ] **GitHub** — Create repo, enable Actions
