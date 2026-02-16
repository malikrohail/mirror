# Mirror Bug Fix Plan

Three issues to fix, ordered by priority. Each section has: root cause, affected files, and exact changes needed.

---

## Issue 1: Quick Start & Manual Setup — Studies Fail to Create/Run

### Problem A: Quick Start "Failed to create test" (validation errors)

**Root Cause:** Two validation mismatches between frontend and backend.

1. **`persona_template_ids` contains `null`** — The LLM-powered test planner (`/api/v1/studies/plan`) returns personas with `template_id: string | null`. The Quick Start component maps these directly into the `persona_template_ids` array. When the LLM doesn't match a persona to an existing template, `template_id` is `null`, which fails Pydantic's `uuid.UUID` validation.

2. **`tasks` exceeds max_length of 3** — The backend schema enforces `max_length=3` on tasks, but the LLM planner can generate 4+ tasks, and the Modify UI allows adding up to 5.

**Also:** React key warning "Encountered two children with the same key, 'null'" at `quick-start.tsx:262` — multiple personas with `template_id: null` get the same React key.

### Fix A: Quick Start persona + task validation

#### File 1: `backend/app/schemas/study.py` (line 21)
Increase the task limit to 5 (or 10) to match what the UI allows:
```python
# BEFORE
tasks: list[TaskCreate] = Field(..., min_length=1, max_length=3)

# AFTER
tasks: list[TaskCreate] = Field(..., min_length=1, max_length=10)
```

#### File 2: `backend/app/core/test_planner.py` — Add template matching
The planner currently returns raw LLM output without matching persona names to actual DB templates. Add a step after LLM generation that queries persona templates and matches by name:

```python
# After plan = await self._llm.plan_study(...)
# Query persona templates from DB and match by name similarity
```

However, the planner doesn't have DB access. The simpler fix is in the **API endpoint**:

#### File 3: `backend/app/api/v1/test_planner.py` — Match personas to templates
After generating the plan, query the DB for persona templates and match by name. Add DB dependency:

```python
@router.post("/studies/plan", response_model=StudyPlanResponse)
async def plan_study(body: StudyPlanRequest, db: AsyncSession = Depends(get_db)):
    llm = LLMClient()
    planner = TestPlanner(llm)
    plan = await planner.plan_study(description=body.description, url=body.url)

    # Match personas to templates by name
    svc = PersonaService(db)
    templates = await svc.list_templates()
    template_map = {t.name.lower(): str(t.id) for t in templates}

    personas = []
    for p in plan.personas:
        # Try exact match, then fuzzy/substring match
        matched_id = template_map.get(p.name.lower())
        if not matched_id:
            # Try substring matching
            for tname, tid in template_map.items():
                if tname in p.name.lower() or p.name.lower() in tname:
                    matched_id = tid
                    break
        personas.append(PlannedPersonaOut(
            name=p.name,
            description=p.description,
            template_id=matched_id,  # Will be None if no match
        ))

    return StudyPlanResponse(tasks=..., personas=personas, ...)
```

#### File 4: `frontend/src/components/study/quick-start.tsx` — Filter null template_ids

In `handleAcceptAndRun()` (line 75), filter out personas with null template_ids:
```typescript
// BEFORE
const personaIds = editablePersonas.map((p) => p.template_id);

// AFTER
const personaIds = editablePersonas
  .map((p) => p.template_id)
  .filter((id): id is string => id != null && id.length > 0);

if (personaIds.length === 0) {
  toast.error('No valid personas matched. Try manual setup instead.');
  setSubmitting(false);
  return;
}
```

Also truncate tasks to the backend max:
```typescript
const tasks = editableTasks.slice(0, 10).map((t, i) => ({
  description: t.description,
  order_index: i,
}));
```

#### File 5: `frontend/src/components/study/quick-start.tsx` (line 262) — Fix React key
```tsx
// BEFORE
key={persona.template_id}

// AFTER
key={persona.template_id ?? `persona-${i}`}
```

Also fix the same issue at line 379:
```tsx
// BEFORE
key={persona.template_id}

// AFTER
key={persona.template_id ?? `persona-${i}`}
```

#### File 6: `frontend/src/types/index.ts` (line 361) — Make template_id nullable
```typescript
// BEFORE
export interface StudyPlanPersona {
  template_id: string;

// AFTER
export interface StudyPlanPersona {
  template_id: string | null;
```

#### File 7: `frontend/src/components/study/quick-start.tsx` — Show unmatched personas
Add visual indicator when a persona has no template match (optional but improves UX):
- Show a warning badge or muted style for personas where `template_id` is null
- Consider adding tooltip: "This persona couldn't be matched to a template and will be skipped"

---

### Problem B: Manual Setup — Study runs but 0 steps, persona "Unknown"

**Root Cause:** Silent failure in persona profile generation → empty persona dict → navigator runs with "Unknown" persona and incomplete data → LLM navigation decisions fail → session times out with 0 steps.

In `orchestrator.py:336-337`:
```python
except Exception as e:
    logger.error("Failed to generate persona %s: %s", persona.id, e)
# Persona silently skipped — profiles list is shorter than study.personas
```

Then at line 590:
```python
persona_dict = persona_map.get(str(session.persona_id), {})  # Falls back to empty dict
```

The empty dict means `persona_dict.get("name", "Unknown")` → "Unknown", and the LLM gets no persona context, causing navigation failures.

### Fix B: Fail loudly on persona generation + fallback

#### File 8: `backend/app/core/orchestrator.py` (lines 306-338) — Don't silently skip personas
```python
async def _generate_persona_profiles(self, study: Any) -> list[dict[str, Any]]:
    profiles = []
    for persona in study.personas:
        try:
            template = persona.profile or {}
            if persona.is_custom and template.get("description"):
                profile = await self._persona_engine.generate_custom(
                    template["description"]
                )
            elif template and template.get("name"):
                profile = self._build_profile_from_template(template)
                logger.info("Persona %s built from template (LLM skipped)", persona.id)
            else:
                profile = await self._persona_engine.generate_random()

            profile_dict = profile.model_dump()
            profile_dict["id"] = str(persona.id)
            profile_dict["behavioral_notes"] = PersonaEngine.get_behavioral_modifiers(profile)
            profiles.append(profile_dict)
        except Exception as e:
            logger.error("Failed to generate persona %s: %s", persona.id, e)
            # ADDED: Create a minimal fallback profile instead of skipping
            fallback = {
                "id": str(persona.id),
                "name": template.get("name", f"Tester {persona.id}"),
                "age": template.get("age", 30),
                "occupation": template.get("occupation", "General user"),
                "tech_literacy": 5,
                "patience_level": 5,
                "reading_speed": 5,
                "trust_level": 5,
                "exploration_tendency": 5,
                "device_preference": "desktop",
                "frustration_triggers": [],
                "goals": [],
                "background": "A general user testing the website.",
                "behavioral_notes": "",
            }
            profiles.append(fallback)
    return profiles
```

#### File 9: `backend/app/core/orchestrator.py` (line 590) — Log warning on missing persona
```python
persona_dict = persona_map.get(str(session.persona_id), {})
if not persona_dict:
    logger.warning(
        "No persona profile found for session %s (persona_id=%s). "
        "Persona map keys: %s",
        session.id, session.persona_id, list(persona_map.keys()),
    )
```

---

## Issue 2: Study Execution Too Slow (4.5 min for a simple search)

### Root Cause: Cumulative pre-step overhead

The session timeout is 120 seconds, but significant time is spent before any step executes:

| Overhead | Location | Time |
|----------|----------|------|
| Live view URL retry loop | `pool.py:555-624` | 6-9s (6 attempts × 1.5s) |
| JS hydration wait | `navigator.py:231` | 1.5s hard-coded |
| Cookie consent scan | `cookie_consent.py` | 1-2s (23 selectors × 500ms) |
| Auth/CAPTCHA detection | `detection.py` | 1-2s |
| Browserbase session create | `pool.py:479-522` | 1-2s + rate limit retries |
| **Total pre-step** | | **~10-16s per persona** |

Additionally, the `STUDY_TIMEOUT_SECONDS=600` is the global timeout for ALL personas. The `SESSION_TIMEOUT_SECONDS=120` is per session. But if the Docker container's `DATABASE_URL` points to Docker-internal `postgres:5432` while the backend runs inside Docker, and the Browserbase connection has latency, the overhead compounds.

### Fix: Reduce unnecessary delays + increase session timeout

#### File 10: `backend/app/browser/pool.py` (lines 557-558) — Reduce live view retries
```python
# BEFORE
max_attempts = 6
retry_delay_seconds = 1.5

# AFTER — live view is non-critical, reduce waiting
max_attempts = 3
retry_delay_seconds = 1.0
```

This reduces worst-case from 9s to 3s. The live view URL is a nice-to-have; navigation can proceed without it.

#### File 11: `backend/app/core/navigator.py` (line 231) — Reduce hydration wait
```python
# BEFORE
await page.wait_for_timeout(1500)

# AFTER — 500ms is usually enough for SPAs; domcontentloaded already fired
await page.wait_for_timeout(500)
```

#### File 12: `backend/app/config.py` (line 54) — Increase session timeout
```python
# BEFORE
SESSION_TIMEOUT_SECONDS: int = 120

# AFTER — give personas more time to complete tasks
SESSION_TIMEOUT_SECONDS: int = 180
```

#### File 13: `backend/app/browser/cookie_consent.py` — Reduce selector timeout
In the cookie consent dismissal loop, reduce the `is_visible` timeout from 500ms to 200ms and limit to top 10 most common selectors:
```python
# BEFORE
if await element.is_visible(timeout=500):

# AFTER
if await element.is_visible(timeout=200):
```

#### File 14: `backend/app/browser/detection.py` — Reduce detection timeout
Same pattern: reduce the per-selector timeout in CAPTCHA/auth detection from 500ms to 200ms.

---

## Issue 3: Traces Don't Persist on Page Refresh

### Root Cause: In-memory Zustand state + no cache invalidation

The study results page (`/study/[id]/page.tsx`) fetches data via React Query hooks (`useStudy`, `useSessions`, `useIssues`, `useInsights`). These hooks work correctly — they fetch from the API on mount.

The **running** page (`/study/[id]/running/page.tsx`) accumulates live data in the Zustand store (`useStudyStore`) via WebSocket events. This data is purely in-memory and lost on refresh.

The real issue is a **two-part problem**:

1. **During a running study:** WebSocket events populate Zustand state (persona progress, step history, think-aloud). On refresh, the WebSocket reconnects but the backend only sends NEW events — it doesn't replay historical ones. The running page polls the API every 2-3s as a fallback, but the Zustand persona progress (step history, emotional states) is gone.

2. **After study completion:** When the user navigates to the results page, React Query fetches fresh data from the API. But if the analysis pipeline hasn't finished writing all data to the DB yet (race condition), issues/insights may come back empty. There's no retry or re-fetch mechanism.

### Fix: Hydrate Zustand from API on reconnect + invalidate cache on completion

#### File 15: `frontend/src/app/study/[id]/running/page.tsx` — Hydrate Zustand from API on mount
The running page already fetches `sessions` via API polling. Add logic to hydrate the Zustand store from the API response when the store is empty (i.e., after a refresh):

```typescript
// On mount or when sessions data arrives and Zustand personas is empty:
useEffect(() => {
  const store = useStudyStore.getState();
  if (sessions && sessions.length > 0 && Object.keys(store.activeStudy?.personas ?? {}).length === 0) {
    // Hydrate from API data
    for (const session of sessions) {
      // Populate persona progress from DB session data
    }
  }
}, [sessions]);
```

#### File 16: `frontend/src/hooks/use-study.ts` — Add `staleTime: 0` for completed studies
```typescript
export function useStudy(id: string) {
  return useQuery({
    queryKey: ['study', id],
    queryFn: () => api.getStudy(id),
    enabled: !!id,
    staleTime: 0,  // Always refetch on mount to get latest data
  });
}
```

Do the same for `useSessions`, `useIssues`, `useInsights`.

#### File 17: `frontend/src/app/study/[id]/running/page.tsx` — Invalidate queries on completion
When the WebSocket `study:complete` event fires, invalidate all React Query caches for this study so the results page gets fresh data:

```typescript
const queryClient = useQueryClient();

// In the WebSocket handler or useEffect watching study completion:
useEffect(() => {
  if (study?.status === 'complete') {
    queryClient.invalidateQueries({ queryKey: ['study', id] });
    queryClient.invalidateQueries({ queryKey: ['sessions', id] });
    queryClient.invalidateQueries({ queryKey: ['issues', id] });
    queryClient.invalidateQueries({ queryKey: ['insights', id] });
  }
}, [study?.status]);
```

#### File 18: `backend/app/api/v1/sessions.py` — Include steps in session response
Ensure the `GET /api/v1/studies/{id}/sessions` endpoint returns enough data for the frontend to reconstruct persona progress after a refresh: session status, total_steps, task_completed, and the persona's name (via joined persona template data).

#### File 19: `frontend/src/stores/study-store.ts` — Optional: Persist to sessionStorage
For a quick win, persist the Zustand store to `sessionStorage` so it survives page refreshes (but not tab closes):

```typescript
import { persist, createJSONStorage } from 'zustand/middleware';

export const useStudyStore = create<StudyStore>()(
  persist(
    (set, get) => ({
      // ... existing store code ...
    }),
    {
      name: 'mirror-study-progress',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
```

---

## Summary: Files to Change

| # | File | Issue | Change |
|---|------|-------|--------|
| 1 | `backend/app/schemas/study.py` | 1A | Increase task max_length to 10 |
| 2 | `backend/app/api/v1/test_planner.py` | 1A | Match persona names to template IDs from DB |
| 3 | `frontend/src/components/study/quick-start.tsx` | 1A | Filter null template_ids, fix React keys, cap tasks |
| 4 | `frontend/src/types/index.ts` | 1A | Make `StudyPlanPersona.template_id` nullable |
| 5 | `backend/app/core/orchestrator.py` | 1B | Fallback profile on persona generation failure + warn on missing persona |
| 6 | `backend/app/browser/pool.py` | 2 | Reduce live view retry attempts (6→3) and delay (1.5s→1s) |
| 7 | `backend/app/core/navigator.py` | 2 | Reduce JS hydration wait (1500ms→500ms) |
| 8 | `backend/app/config.py` | 2 | Increase SESSION_TIMEOUT_SECONDS (120→180) |
| 9 | `backend/app/browser/cookie_consent.py` | 2 | Reduce per-selector timeout (500ms→200ms) |
| 10 | `backend/app/browser/detection.py` | 2 | Reduce detection timeout (500ms→200ms) |
| 11 | `frontend/src/hooks/use-study.ts` | 3 | Set `staleTime: 0` for study data hooks |
| 12 | `frontend/src/app/study/[id]/running/page.tsx` | 3 | Invalidate queries on study:complete, hydrate Zustand from API |
| 13 | `frontend/src/stores/study-store.ts` | 3 | Persist to sessionStorage via Zustand middleware |

## Implementation Order

1. **Issue 1A** first (Quick Start failures) — highest user impact, simplest fix
2. **Issue 1B** next (persona generation fallback) — prevents 0-step sessions
3. **Issue 2** (speed improvements) — reduce timeouts and delays
4. **Issue 3** (trace persistence) — improve data durability on refresh
