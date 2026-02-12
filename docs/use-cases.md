# MIRROR — Real Use Cases & Example Outputs

*Explained so anyone can understand it.*

---

## What Is Mirror? (The 30-Second Version)

Imagine you built a website. Before you show it to customers, you want to know:

- **Can people actually use it?**
- **Where do they get confused?**
- **Does the signup form make sense to a grandparent? To a teenager? To someone who doesn't speak English well?**

Normally, you'd hire 5 real people, pay them $200-$600 each, schedule sessions, watch them use your site, take notes, and write a report. That costs **$12,000+** and takes **6 weeks**.

**Mirror does the same thing in 5 minutes for $15.**

It creates fake but realistic "people" (AI personas), opens a real web browser for each one, and makes them actually try to use your website — clicking buttons, filling forms, scrolling around. Then it tells you exactly where they got stuck and how to fix it.

---

## Use Case 1: "My Signup Page Is Killing My Conversions"

### The Situation

**Sarah** runs a small project management SaaS called TaskFlow. She's getting 1,000 visitors/month to her website, but only 30 people sign up. That's a 3% conversion rate — terrible.

She thinks her signup page might be the problem, but she doesn't know what's wrong with it. She can't afford to hire a UX researcher.

### What Sarah Does

1. Goes to Mirror
2. Pastes her URL: `https://taskflow.app`
3. Types one task: **"Sign up for a free account"**
4. Picks 5 AI personas (uses the defaults)
5. Clicks **"Run Study"**
6. Waits 4 minutes

### What Mirror Does Behind the Scenes

Mirror opens 5 real web browsers simultaneously. In each browser, a different AI "person" tries to sign up for TaskFlow. Each person has a different background:

- **Jake, 21** — college student, very tech-savvy, impatient
- **Margaret, 68** — retired teacher, not very comfortable with computers
- **Raj, 35** — busy marketing manager, wants to get things done fast
- **Sofia, 28** — graphic designer from Brazil, English is her second language
- **David, 42** — first time hearing about TaskFlow, no context about what it does

Each AI persona literally clicks, types, and scrolls through the real website — just like a real person would.

### What Sarah Sees — The Results

---

**STUDY RESULTS: taskflow.app**
**UX Score: 58/100**
**Issues Found: 11** (3 Critical, 4 Major, 4 Minor)
**Task Completed: 2 out of 5 personas** (40%)

---

**WHO MADE IT? WHO DIDN'T?**

| Persona | Completed Signup? | Steps Taken | How They Felt |
|---------|:-:|:-:|---|
| Jake, 21 (tech-savvy) | Yes | 8 steps | "Pretty standard, but the workspace thing was weird" |
| Margaret, 68 (retiree) | **NO — gave up** | 19 steps | "I don't understand what half of these words mean" |
| Raj, 35 (busy professional) | Yes | 10 steps | "Too many steps. Why do I need to set all this up before I can even see the product?" |
| Sofia, 28 (non-native English) | **NO — gave up** | 14 steps | "What is an 'onboarding workflow'? I don't know this word" |
| David, 42 (first-time visitor) | **NO — gave up** | 16 steps | "I clicked Sign Up but I still don't know what this product actually does" |

---

**TOP 3 ISSUES (with evidence)**

**Issue #1: CRITICAL — "Workspace" jargon in signup form**

> **What happened:** 4 out of 5 personas hesitated or got confused at the "Workspace Name" field during signup. Margaret typed "Margaret" because she thought it was asking for her name. Sofia left it blank because she didn't know the English word "workspace."
>
> **Screenshot evidence:**
> ```
> ┌─────────────────────────────────────┐
> │  Create your account                │
> │                                     │
> │  Email: [margaret@gmail.com    ]    │
> │  Password: [••••••••           ]    │
> │                                     │
> │  Workspace Name: [???          ] ← ⚠️ 4/5 personas confused here
> │                                     │
> │  (no tooltip, no explanation,       │
> │   no example text)                  │
> │                                     │
> │  [Create Account]                   │
> └─────────────────────────────────────┘
> ```
>
> **Margaret's thoughts at this step:**
> *"Workspace name? I don't have a workspace. I just want to try this software. Is this my name? My company? I don't have a company. I'll just type my name and hope for the best."*
>
> **Fix:** Replace "Workspace Name" with "Team Name" or "Your Company." Add placeholder text like "e.g., Acme Inc. or My Projects." Add a small (?) tooltip explaining what this is.
>
> **Impact:** High — fixing this alone could unblock 3 of 5 personas
> **Effort:** 15 minutes of work

---

**Issue #2: CRITICAL — 7-step onboarding before seeing the product**

> **What happened:** After signup, TaskFlow forces users through 7 setup screens (choose plan, invite teammates, set timezone, pick template, customize columns, set notifications, take a tour). David and Margaret both gave up during onboarding. Raj completed it but was frustrated.
>
> **Evidence — David's journey through onboarding:**
>
> Step 1: Choose Plan → ✅ clicked Free
> Step 2: Invite Teammates → ✅ clicked Skip
> Step 3: Set Timezone → ✅ selected timezone
> Step 4: Pick Template → ❓ "I don't know what kind of project I want yet"
> Step 5: Customize Columns → ❌ **"I just want to see the product. Why am I setting up columns before I've even used it?"**
> Step 6: *(David clicked the browser back button trying to escape)*
> Step 7: *(Never reached)*
>
> **David's thoughts at step 5:**
> *"I have no idea what 'Kanban columns' are. I just wanted to see if this tool could help me organize my renovation project. I'm going to go back to using sticky notes."*
>
> **Fix:** Let users skip ALL of onboarding. Show the product immediately with a sample project pre-loaded. Let them customize later.
>
> **Impact:** High — 2 personas gave up entirely because of this
> **Effort:** 1-2 days of work

---

**Issue #3: MAJOR — No explanation of what TaskFlow does on the signup page**

> **What happened:** David arrived at the signup page from a Google search. The signup page only says "Create Your Account" — it doesn't explain what TaskFlow is or what he'll get after signing up.
>
> **David's thoughts:**
> *"I'm on a signup page but I'm not 100% sure what I'm signing up for. There's no description, no screenshots of the product, nothing. I'll sign up and see, but I'm not confident."*
>
> **Fix:** Add a short value proposition next to the signup form. Something like: "TaskFlow helps teams organize projects with boards, lists, and timelines. Free for up to 5 users."
>
> **Impact:** Medium — helps first-time visitors who arrive directly at /signup
> **Effort:** 30 minutes of work

---

**RECOMMENDATIONS (prioritized by impact vs effort)**

| # | What to Fix | Impact | Effort | Personas Helped |
|---|------------|--------|--------|----------------|
| 1 | Replace "Workspace" with "Team Name" + add tooltip | High | 15 min | 4 out of 5 |
| 2 | Make onboarding skippable, show product immediately | High | 1-2 days | 3 out of 5 |
| 3 | Add product description on signup page | Medium | 30 min | 2 out of 5 |
| 4 | Simplify password requirements message | Low | 15 min | 1 out of 5 |

---

### The Outcome

Sarah fixes issue #1 (takes 15 minutes) and issue #2 (takes a day). She runs Mirror again the next week. New results:

- **Task completed: 4 out of 5 personas** (up from 2 out of 5)
- **UX Score: 78/100** (up from 58)
- **Margaret still struggled** but finished this time — she needed a bigger font size and clearer button labels

Sarah's real signup rate goes from 3% to 7% over the next month. That's 70 signups instead of 30 — more than double.

**Total cost of using Mirror: $15. Total time: 10 minutes. Revenue impact: potentially thousands of dollars.**

---

---

## Use Case 2: "Is My E-Commerce Checkout Losing Me Sales?"

### The Situation

**Mike** sells handmade leather bags online at `leathercraft.co`. He gets plenty of visitors who add items to their cart, but 70% of them abandon at checkout. He has no idea why.

### What Mike Does

1. Pastes URL: `https://leathercraft.co/products/classic-tote`
2. Task: **"Add the Classic Tote bag to your cart and complete the purchase"**
3. Picks 3 personas: Busy Professional, Retiree, Privacy-Conscious User

### What Mirror Finds

**Task Completed: 1 out of 3 personas** (33%)

**Here's what happened to each persona:**

---

**Raj (Busy Professional) — COMPLETED but frustrated**

> Step 1: Lands on product page. "Nice bag. $189. I'll buy it." → Clicks Add to Cart.
> Step 2: Cart page. "Okay, $189 + ... wait where's the shipping cost? It just says 'calculated at checkout.' I hate that."
> Step 3: Clicks Checkout. Sees "Create Account or Continue as Guest." → Clicks Guest.
> Step 4: Fills shipping info. 12 fields. "Why do I need a phone number to buy a bag?"
> Step 5: Payment page. Only sees credit card fields. "No Apple Pay? No PayPal? Ugh, fine."
> Step 6-8: Completes purchase.
>
> **Raj's verdict:** "I bought it, but I almost didn't. The hidden shipping cost and no Apple Pay almost made me leave."

---

**Margaret (Retiree) — GAVE UP at payment**

> Step 1-3: Same as Raj, but slower. Reads everything carefully.
> Step 4: Shipping form. "It's asking for my apartment/suite number. I live in a house. Is this required?" → Tries to skip it, gets a red error.
> Step 5: **Margaret gets a red error "Suite/Apt is required" even though she doesn't have one.**
> Step 6: Types "N/A" — error persists. Types "None" — error persists. The field validates for numbers only.
> Step 7: **"I can't get past this form. Something is broken. I'll just call them instead."**
> Step 8: Gives up.
>
> **Margaret's verdict:** "The website is broken. It won't let me buy the bag because I don't have an apartment number."

---

**Alex (Privacy-Conscious) — GAVE UP at account creation**

> Step 1-2: Same as others.
> Step 3: Sees "Create Account or Continue as Guest." Clicks Guest.
> Step 4: The next page says "Enter your email to continue." Then in tiny text: "By entering your email, you agree to receive marketing communications."
> Step 5: **"I just want to buy a bag, not sign up for a newsletter. And there's no way to uncheck this."**
> Step 6: Looks for a way to proceed without email marketing consent. There isn't one.
> Step 7: **"I'm not giving them my email if they're going to spam me. I'll find this bag somewhere else."**
> Step 8: Gives up.
>
> **Alex's verdict:** "Forced marketing opt-in is a dealbreaker. I don't trust websites that do this."

---

**TOP ISSUES FOUND:**

| # | Issue | Severity | Who It Affected |
|---|-------|----------|----------------|
| 1 | Apartment/Suite field is required and doesn't accept "N/A" | **Critical** — literally prevents purchase | Margaret |
| 2 | Forced marketing opt-in at checkout with no unsubscribe option | **Critical** — privacy-conscious users leave | Alex |
| 3 | Shipping cost hidden until checkout | **Major** — surprise costs cause abandonment | Raj |
| 4 | No Apple Pay / PayPal / Google Pay | **Major** — friction for mobile and fast buyers | Raj |
| 5 | 12-field shipping form (could be 6 with address autocomplete) | **Minor** — adds unnecessary time | All 3 |

---

### The Outcome

Mike had no idea the apartment field was broken — it was a bug in his Shopify theme that had been there for months. He also didn't realize the marketing opt-in was forced.

He fixes the apartment field bug (5 minutes), makes marketing opt-in optional (5 minutes), and adds PayPal (30 minutes via Shopify settings).

His cart abandonment drops from 70% to 52% — and each saved sale is $189.

**Mirror literally found a checkout-breaking bug that was silently costing Mike thousands of dollars in lost sales.**

---

---

## Use Case 3: "We're Launching a New Landing Page Tomorrow — Is It Ready?"

### The Situation

**Priya** is a product manager at a startup. Her team just built a new landing page for their AI writing tool. They're launching it tomorrow and running Google Ads to drive traffic.

She doesn't have time for a formal review. She just wants to know: **"Will people understand what we do and sign up?"**

### What Priya Does

1. Pastes URL: `https://writegenius.ai` (staging environment)
2. Task 1: **"Figure out what this product does and how much it costs"**
3. Task 2: **"Sign up for the free trial"**
4. Picks 5 personas, runs the study during her lunch break

### What Mirror Finds (Task 1: "Figure out what this product does")

| Persona | Understood the Product? | How Long It Took | What Confused Them |
|---------|:-:|:-:|---|
| Jake (21, student) | Yes | 15 seconds | Nothing — headline was clear |
| Margaret (68, retiree) | **Partially** | 2 minutes | "AI writing tool — but for what? Emails? Essays? I don't understand 'content generation'" |
| Raj (35, professional) | Yes | 30 seconds | Pricing was clear but "What's the difference between 'Pro' and 'Business'?" |
| Sofia (28, non-native English) | **No** | 3 minutes | "The headline says 'Supercharge your content pipeline.' I don't know what 'pipeline' means here" |
| David (42, first-timer) | **Partially** | 1.5 minutes | "I see it writes content, but can it write a business proposal? The examples only show blog posts" |

**Key Insight:**

> 3 out of 5 personas struggled to understand exactly what WriteGenius does. The headline uses jargon ("content pipeline," "AI-powered generation") that tech-savvy users understand but normal people don't.
>
> **Sofia's actual thought process:**
> *"Supercharge your content pipeline... Pipeline? Like a water pipe? Oh, maybe it means making content faster? But what content? I see pictures of blog posts. Can it help me write emails to my clients? I'm not sure this is for me."*
>
> **Recommendation:** Replace "Supercharge your content pipeline" with "Write blog posts, emails, and social media 10x faster with AI." Be specific. Show examples of different use cases, not just blogs.

### What Mirror Finds (Task 2: "Sign up for the free trial")

Everyone completed this task. But Mirror noticed something interesting:

> **4 out of 5 personas clicked "Pricing" before "Sign Up."** They wanted to know the cost before committing. But the "Start Free Trial" button at the top of the page doesn't mention that it's free. It just says "Start Free Trial" — which some personas interpreted as "start a trial that will eventually cost money."
>
> **Margaret's thought process:**
> *"It says 'free trial' but for how long? And then what happens? Will they charge my credit card automatically? I've been burned by that before. Let me check the pricing page first... Okay, it says 'no credit card required.' Why didn't it say that next to the signup button?"*
>
> **Recommendation:** Change the CTA button from "Start Free Trial" to "Start Free Trial — No Credit Card Required." This one change could significantly boost signups.

### The Outcome

Priya makes two changes in 30 minutes:
1. Rewrites the headline to be clearer
2. Adds "No credit card required" to the CTA button

The team launches the next day with confidence. Their ad campaign converts at 8% instead of the 4% they would have gotten with the confusing headline.

**Mirror saved them from launching a $10,000 ad campaign with a confusing landing page.**

---

---

## Use Case 4: "Our Redesign Looks Great to Us — But Does It Work?"

### The Situation

**Tom** is a designer who just redesigned his company's dashboard. The whole team loves it. It looks modern, clean, and beautiful.

But Tom remembers what happened last time they redesigned — users hated it and support tickets tripled. He wants to test this time before shipping.

### What Tom Does

1. Pastes the staging URL of the new dashboard
2. Task: **"Find last month's sales report and export it as PDF"**
3. Picks 3 personas: Busy Professional, Retiree, First-Time User
4. Also runs the **same study on the OLD dashboard** for comparison

### Mirror's Before vs After Comparison

**OLD Dashboard:**

| Persona | Completed? | Steps | Time | Frustration Level |
|---------|:-:|:-:|:-:|:-:|
| Raj (professional) | Yes | 4 steps | 45 sec | Low |
| Margaret (retiree) | Yes | 7 steps | 2 min | Medium |
| David (first-timer) | Yes | 6 steps | 1.5 min | Low |

**NEW Dashboard (redesign):**

| Persona | Completed? | Steps | Time | Frustration Level |
|---------|:-:|:-:|:-:|:-:|
| Raj (professional) | Yes | 6 steps | 1.5 min | Medium |
| Margaret (retiree) | **NO** | 12 steps | 3.5 min | **High** |
| David (first-timer) | Yes | 9 steps | 2.5 min | Medium |

**Oh no. The redesign made things worse.**

**What went wrong:**

> **Issue #1: The "Reports" section moved from the left sidebar to a dropdown menu inside "Analytics."**
>
> On the old dashboard, "Reports" was right there in the sidebar — click it, done. On the new dashboard, you have to click "Analytics" first, then find "Reports" in a dropdown. Every single persona took longer.
>
> Margaret couldn't find it at all:
> *"Where did Reports go? I used to click it right here on the left. Now I don't see it. Let me look at all these menu items... Analytics? I don't want analytics, I want my reports. Oh wait, maybe reports are inside analytics? Let me click... yes! There it is. But why did they hide it?"*
>
> **Issue #2: The export button changed from a labeled "Export PDF" button to a small icon (↓) with no text.**
>
> Old version: Big button that says "Export as PDF" — obvious.
> New version: A tiny download arrow icon in the top-right corner — all 3 personas had to hunt for it.
>
> Margaret's reaction: *"I need to download this as a PDF. I see some little pictures up here but I don't know what they do. This little arrow? Let me try... yes! That was the download. But how would anyone know that?"*

**Mirror's Recommendation:**

> Your redesign improved visual aesthetics but hurt usability for the "find and export reports" task. Consider:
> 1. Keep "Reports" as a top-level sidebar item (don't bury it under Analytics)
> 2. Add a text label to the export icon, or at minimum a tooltip
> 3. Run Mirror again after these changes to verify improvement

### The Outcome

Tom adjusts the redesign before shipping. He keeps the new look but restores the sidebar navigation and adds icon labels. The team ships a redesign that's both beautiful AND usable.

**Mirror prevented a redesign disaster that would have generated hundreds of angry support tickets.**

---

---

## Use Case 5: "Is Our Website Accessible?"

### The Situation

**Lisa** is the lead developer at a healthcare company. They're legally required to meet WCAG accessibility standards (because they receive government funding), but no one on the team actually uses a screen reader or has low vision. They have no idea if their website is accessible.

An accessibility audit from a consulting firm costs **$10,000-$25,000**.

### What Lisa Does

1. Pastes URL: `https://healthportal.care/appointments`
2. Task: **"Book an appointment with Dr. Johnson for next Tuesday"**
3. Picks 3 accessibility-focused personas:
   - **Screen Reader User** — navigates entirely with keyboard, relies on ARIA labels
   - **Low Vision User** — needs large text, high contrast, clear visual hierarchy
   - **Cognitive Accessibility User** — has ADHD, gets overwhelmed by busy interfaces

### What Mirror Finds

**Screen Reader Persona (navigates with keyboard only):**

> Step 1: Tab through the page. "I can tab to the navigation menu. Good."
> Step 2: Tab to "Appointments." "The link says 'Appointments.' Clear."
> Step 3: Tab through the appointment booking form. **"There's a dropdown here but it has no label. My screen reader just says 'combobox.' I don't know what this dropdown is for."**
> Step 4: **"I found what I think is a date picker, but I can't operate it with my keyboard. It requires a mouse click. I'm stuck."**
> Step 5: Gives up.
>
> **Issues found:**
> - CRITICAL: Date picker is mouse-only — completely inaccessible via keyboard
> - CRITICAL: Doctor selection dropdown has no ARIA label
> - MAJOR: Form error messages are not announced to screen readers
> - MINOR: Skip-to-content link is missing

**Low Vision Persona:**

> Step 3: **"The calendar is very small. The dates are in light gray text on a white background. I can barely read them."**
> Step 5: **"The 'Book Appointment' button is a pale blue on a white background. I almost missed it."**
>
> **Issues found:**
> - CRITICAL: Calendar text contrast ratio is 2.1:1 (needs to be at least 4.5:1 per WCAG AA)
> - MAJOR: CTA button has insufficient contrast (3.2:1)
> - MINOR: No option to increase text size within the app

**ADHD Persona:**

> Step 2: **"There's a lot happening on this page. Promotions, news updates, appointment reminders, a chat widget popping up... I just want to book an appointment but I'm distracted by everything else."**
> Step 4: **"The booking form is 3 screens long. I lost focus halfway through and accidentally navigated away. When I came back, my form data was gone."**
>
> **Issues found:**
> - MAJOR: Too many competing elements on the page (cognitive overload)
> - MAJOR: Form data not preserved when navigating away and returning
> - MINOR: Auto-playing chat widget is distracting

---

**Mirror's Accessibility Report Card:**

| Category | Score | Status |
|----------|:-----:|:------:|
| Keyboard Navigation | 35/100 | FAIL |
| Screen Reader Compatibility | 40/100 | FAIL |
| Color Contrast | 55/100 | FAIL |
| Cognitive Accessibility | 60/100 | NEEDS WORK |
| **Overall WCAG AA Compliance** | **45/100** | **FAIL** |

**Top 3 Fixes:**
1. Make the date picker keyboard-accessible (CRITICAL — legal requirement)
2. Fix all color contrast ratios to meet 4.5:1 minimum (CRITICAL — legal requirement)
3. Add ARIA labels to all form controls (CRITICAL — legal requirement)

### The Outcome

Lisa fixes the 3 critical issues in a week. She runs Mirror again — score jumps to 82/100. She schedules Mirror to run monthly as a regression check.

**Mirror replaced a $15,000 accessibility audit. And unlike a one-time audit, Mirror can be run every month to catch new issues.**

---

---

## Why Can't You Just Paste Your Website Into ChatGPT/Claude Instead?

This is the most important question. Here's the honest answer:

| What You'd Need to Do | ChatGPT/Claude | Mirror |
|----------------------|:-:|:-:|
| Actually open your website in a real browser | No — it can only look at screenshots you manually take | **Yes — opens a real browser automatically** |
| Click buttons, fill forms, navigate pages | No — you'd have to describe what happened | **Yes — actually clicks, types, and scrolls** |
| Test with 5 different persona types simultaneously | No — one conversation, one persona at a time | **Yes — 5 parallel browser sessions** |
| Capture screenshots at every step automatically | No — you'd have to screenshot and paste manually | **Yes — automatic screenshot at every step** |
| Generate a heatmap of where people click | No | **Yes** |
| Compare how different personas experienced the same page | No — you'd have to manually run 5 separate chats | **Yes — automatic comparison dashboard** |
| Find bugs like the broken apartment field (Use Case 2) | No — it can't fill out forms on your live site | **Yes — it actually fills forms and encounters real errors** |
| Test keyboard accessibility | No — it can't press Tab on your website | **Yes — simulates keyboard-only navigation** |
| Run the same test again after you fix something | Start over from scratch | **One click re-run** |
| Get a professional PDF report to share with your team | No | **Yes** |

**The short version:** ChatGPT/Claude can *talk about* your website. Mirror can actually *use* it. That's the difference.

---

## Quick Reference: When to Use Mirror

| Situation | Use Mirror? | Why |
|-----------|:-:|---|
| "We're launching a new page tomorrow" | **YES** | Quick sanity check before real users see it |
| "Our signup conversion rate is bad" | **YES** | Find exactly where and why users drop off |
| "We redesigned our product" | **YES** | Compare before vs. after with the same personas |
| "We need an accessibility audit" | **YES** | Cheaper and faster than consultants, good for initial screening |
| "My checkout has high abandonment" | **YES** | May find bugs or friction you never knew about |
| "I want A/B test ideas" | **YES** | Mirror tells you what to test |
| "I need pixel-perfect design feedback" | No | Mirror evaluates usability, not visual design details |
| "I need legal compliance certification" | No | Use Mirror for initial screening, but get formal certification from a qualified auditor |

---

## What A Study Costs

| Study Size | Personas | Approx. Cost | Time |
|-----------|:--------:|:------------:|:----:|
| Quick check | 3 personas, 1 task | ~$8 | 3 min |
| Standard | 5 personas, 1-2 tasks | ~$15 | 5 min |
| Thorough | 5 personas, 3 tasks | ~$30 | 10 min |
| Deep dive (with accessibility) | 8 personas, 3 tasks | ~$50 | 15 min |

Compare this to traditional user testing: **$12,000-$18,000 for a single study.**

---

*Mirror: Watch AI personas break your website — so real users don't have to.*
