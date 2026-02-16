# Fix Plan: Post-DB-Isolation Polish (5 Issues)

> **Context**: After fixing the per-session DB isolation bug, studies now complete
> successfully (95/100, 100% task completion, 4-5 steps per persona). However,
> 5 issues remain that prevent the full end-to-end experience from working.
>
> **DB proof**: Steps table now has 9 rows with real data (think_aloud, screenshot_path,
> click coordinates, emotional states). Screenshots exist on disk at
> `backend/data/studies/{id}/sessions/{id}/steps/step_NNN.png`.
>
> **API proof**: `GET /api/v1/sessions/{id}` returns full `SessionDetail` with nested
> `steps[]` and `issues[]`. Screenshot endpoint returns 200 for real paths.

---

## Issue 1: Session Replay Page Shows No Steps

### Problem
The "Replay" button on the results page goes to `/study/{studyId}/session/{sessionId}`.
The session replay UI components are all fully implemented, but clicking Replay
likely shows an empty state or errors. Need to verify the data flows correctly
from API to the rendered replay components.

### Root Cause Investigation
The data path is:
```
Results page "Replay" button
  → Link href={`/study/${id}/session/${sessions?.[0]?.id}`}
  → /study/[id]/session/[sessionId]/page.tsx
  → SessionReplay component
  → useSessionDetail(sessionId) hook
  → api.getSession(sessionId)
  → GET /api/v1/sessions/{sessionId}
  → Returns SessionDetail { steps: StepOut[], issues: IssueOut[] }
  → SessionReplay renders steps[currentStep]
  → ScreenshotViewer calls getScreenshotUrl(step.screenshot_path)
  → <img src="/api/v1/screenshots/{path}">
  → Next.js rewrite proxies to http://localhost:8000/api/v1/screenshots/{path}
  → FastAPI FileResponse from backend/data/{path}
```

### Verified Working
- `GET /api/v1/sessions/ed6572ad-80de-4aeb-a83b-5001f0c467da` returns 4 steps with all fields populated
- `GET /api/v1/screenshots/studies/270a71bb-.../sessions/ed6572ad-.../steps/step_001.png` returns HTTP 200
- PNG files exist on disk at `backend/data/studies/.../steps/step_NNN.png`

### What to Check & Fix

**Step 1: Test the replay page in the browser manually**

Open the browser dev tools Network tab, navigate to a session replay page, and check:
- Does `GET /api/v1/sessions/{id}` return data with `steps` array?
- Does the `steps` array have `screenshot_path` values?
- Do the screenshot image requests (`/api/v1/screenshots/...`) return 200 or 404?

**Step 2: Check the Replay button link**

File: `frontend/src/app/study/[id]/page.tsx` line 68
```tsx
<Link href={`/study/${id}/session/${sessions?.[0]?.id ?? ''}`}>
```
This links to the FIRST session only. If `sessions` is empty or still loading,
this links to `/study/{id}/session/` (empty sessionId) which would break.

**Fix**: Guard the Replay button — only render it when sessions are loaded and non-empty:
```tsx
{sessions && sessions.length > 0 && (
  <Button variant="outline" size="sm" asChild>
    <Link href={`/study/${id}/session/${sessions[0].id}`}>
      <Eye className="mr-2 h-4 w-4" />
      Replay
    </Link>
  </Button>
)}
```

**Step 3: Check ScreenshotViewer image URL construction**

File: `frontend/src/components/session/screenshot-viewer.tsx` line 32
```tsx
src={getScreenshotUrl(screenshotPath)}
```

File: `frontend/src/lib/api-client.ts` line 165-167
```ts
export function getScreenshotUrl(path: string): string {
  return `${API_BASE}/screenshots/${path}`;
}
```

Where `API_BASE = '/api/v1'` (from `frontend/src/lib/constants.ts` line 1).

So the final URL becomes: `/api/v1/screenshots/studies/270a71bb-.../steps/step_001.png`

This gets proxied by Next.js rewrite (`next.config.ts` lines 5-11):
```ts
{ source: "/api/v1/:path*", destination: "http://localhost:8000/api/v1/:path*" }
```

**Potential issue**: The `screenshot_path` in DB is stored as:
```
studies/270a71bb-.../sessions/ed6572ad-.../steps/step_001.png
```
This is a multi-segment path. The Next.js rewrite uses `:path*` which should
match multi-segment paths. But verify this works — if the proxy strips or
encodes the slashes, the screenshot endpoint will 404.

**Test command**:
```bash
curl -s -o /dev/null -w "%{http_code}" \
  http://localhost:3000/api/v1/screenshots/studies/270a71bb-9118-4214-9aa7-e76f279f2ccb/sessions/07cabd10-bc68-4c85-8b2d-5dc888471001/steps/step_001.png
```
Should return 200. If it returns 404, the Next.js proxy isn't forwarding correctly.

**Step 4: Check SessionReplay component data rendering**

File: `frontend/src/components/session/session-replay.tsx`

The component uses:
```tsx
const { data: session, isLoading, error } = useSessionDetail(sessionId);
```

And then:
```tsx
const step = session?.steps?.[currentStep];
```

And renders:
```tsx
<ScreenshotViewer screenshotPath={step?.screenshot_path ?? null} />
```

If `session.steps` is an empty array, `step` will be undefined and the viewer
shows "No screenshot available". Check that the API actually returns steps
nested inside the session response.

**Step 5: Verify the session detail endpoint eager-loads steps**

File: `backend/app/db/repositories/session_repo.py`

The `get_session()` method should use `selectinload` to eagerly load steps:
```python
async def get_session(self, session_id: uuid.UUID) -> Session | None:
    stmt = (
        select(Session)
        .where(Session.id == session_id)
        .options(selectinload(Session.steps), selectinload(Session.issues))
    )
    result = await self.db.execute(stmt)
    return result.scalar_one_or_none()
```

Verify this is the case. If steps are lazy-loaded, they won't be included in
the API response because the session is serialized outside the DB session scope.

### Files to Touch
- `frontend/src/app/study/[id]/page.tsx` — guard Replay button link
- `frontend/src/components/session/session-replay.tsx` — verify data flow, add error states
- `frontend/src/components/session/screenshot-viewer.tsx` — verify image loading
- `backend/app/db/repositories/session_repo.py` — verify selectinload on steps

### Validation
1. Navigate to a completed study results page
2. Click "Replay" → should load session replay page
3. Should see screenshot for step 1 with think-aloud bubble
4. Arrow keys / play button should cycle through steps
5. Step timeline should show all steps with emotional state icons

---

## Issue 2: Heatmap Page May Be Empty

### Problem
Heatmap requires `click_x` and `click_y` to be non-null in the steps table.
Looking at the actual DB data:

```
step 1: click_x=932, click_y=597  (click action)
step 2: click_x=NULL, click_y=NULL (type action — expected, no click)
step 3: click_x=NULL, click_y=NULL (type/click action — PROBLEM if click)
step 4: click_x=NULL, click_y=NULL (done action — expected)
```

Only 2 out of 9 steps have click coordinates. The `type` and `done` actions
having NULL is correct. But some `click` actions also have NULL — this is
because `get_click_position()` failed to find the element's bounding box.

### Root Cause

File: `backend/app/core/navigator.py` lines 294-303
```python
if (
    decision.action.type == ActionType.click
    and decision.action.selector
):
    pos = await self._screenshots.get_click_position(
        page, decision.action.selector
    )
    if pos:
        click_x, click_y = pos
```

File: `backend/app/browser/screenshots.py` lines 221-234
```python
async def get_click_position(self, page, selector) -> tuple[int, int] | None:
    try:
        box = await page.locator(selector).bounding_box(timeout=3_000)
        if box:
            return (int(box["x"] + box["width"] / 2), int(box["y"] + box["height"] / 2))
    except Exception:
        pass
    return None
```

The `bounding_box()` call times out or the element is not found after the
click has already been performed (the page may have navigated away).

### Fix

**Option A (Recommended)**: Capture click position BEFORE executing the action,
not after. The element exists before the click but may not after navigation.

File: `backend/app/core/navigator.py`, in `_execute_step()`:

Currently the code does: ACT first, then try to get click position.
Change it to: get click position BEFORE acting.

```python
# 3. GET CLICK POSITION (before acting, element still exists)
click_x: int | None = None
click_y: int | None = None

if (
    decision.action.type == ActionType.click
    and decision.action.selector
):
    pos = await self._screenshots.get_click_position(
        page, decision.action.selector
    )
    if pos:
        click_x, click_y = pos

# 4. ACT (element may disappear after this)
if decision.action.type not in (ActionType.done, ActionType.give_up):
    action_result = await self._actions.execute(
        page, decision.action.type.value, **action_kwargs
    )
```

**Option B (Fallback)**: If the element can't be found, estimate from the
viewport center or use the selector's expected position from the a11y tree.

### Heatmap Backend Verification

File: `backend/app/services/session_service.py` lines 56-93

The `get_heatmap_data()` method filters for `click_x IS NOT NULL AND click_y IS NOT NULL`.
This is correct — but with the current bug, most click steps have NULL coordinates,
so the heatmap will have very few data points.

After applying Fix Option A, re-run a study and verify that click actions
have populated click_x/click_y values.

### Also Missing: Persona Name in Heatmap Data

File: `backend/app/services/session_service.py`

The `HeatmapDataPoint` schema has a `persona_name` field but the backend
doesn't populate it. To fix: join `Step → Session → Persona` and extract
the persona name from the profile JSONB.

### Files to Touch
- `backend/app/core/navigator.py` — move click position capture before action execution
- `backend/app/services/session_service.py` — populate `persona_name` in heatmap data points

### Validation
1. Run a new study after the fix
2. Check DB: `SELECT click_x, click_y FROM steps WHERE action_type = 'click'` — should be non-null
3. Navigate to Heatmap page → should show colored dots on the canvas
4. Page selector dropdown should list the visited URLs

---

## Issue 3: Screenshots Saved to Disk but May Not Serve via Frontend

### Problem
Screenshots are confirmed working when hitting the backend directly:
```bash
curl http://localhost:8000/api/v1/screenshots/studies/.../steps/step_001.png  # 200 OK
```

But the frontend accesses them through Next.js proxy at `localhost:3000`.

### Root Cause (Potential)

The Next.js rewrite in `frontend/next.config.ts`:
```ts
{ source: "/api/v1/:path*", destination: "http://localhost:8000/api/v1/:path*" }
```

The `screenshot_path` is a deeply nested path like:
```
studies/270a71bb-9118-4214-9aa7-e76f279f2ccb/sessions/07cabd10-bc68-4c85-8b2d-5dc888471001/steps/step_001.png
```

The Next.js `:path*` catch-all SHOULD handle this. But some versions of Next.js
have issues with deeply nested rewrite paths or with `.png` extensions.

### What to Check & Fix

**Step 1: Test through the Next.js proxy**
```bash
curl -s -o /dev/null -w "%{http_code}" \
  http://localhost:3000/api/v1/screenshots/studies/270a71bb-9118-4214-9aa7-e76f279f2ccb/sessions/07cabd10-bc68-4c85-8b2d-5dc888471001/steps/step_001.png
```

If this returns 404 but the direct backend URL returns 200, the problem is
the Next.js rewrite.

**Step 2: If the proxy fails, use the `next/image` approach**

Instead of proxying binary files through Next.js rewrite, change
`getScreenshotUrl()` to hit the backend directly:

File: `frontend/src/lib/api-client.ts` line 165
```ts
// Current
export function getScreenshotUrl(path: string): string {
  return `${API_BASE}/screenshots/${path}`;
}

// Fix: point directly to backend for binary assets
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
export function getScreenshotUrl(path: string): string {
  return `${BACKEND_URL}/api/v1/screenshots/${path}`;
}
```

Then update `next.config.ts` to allow images from localhost:8000 (already configured):
```ts
images: {
  remotePatterns: [
    { protocol: "http", hostname: "localhost", port: "8000" },
  ],
},
```

**Step 3: If using direct backend URL, handle CORS**

File: `backend/app/main.py` — ensure CORS middleware allows `localhost:3000`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Check if this middleware already exists. If not, add it.

### Files to Touch
- `frontend/src/lib/api-client.ts` — potentially change `getScreenshotUrl()`
- `frontend/next.config.ts` — potentially adjust rewrites
- `backend/app/main.py` — verify CORS configuration

### Validation
1. Open session replay page in browser
2. Open Network tab in dev tools
3. Check that screenshot image requests return 200 with `image/png` content-type
4. Screenshots should render visually in the ScreenshotViewer component

---

## Issue 4: Issues Tab Lacks Page URL Context for Linking to Steps

### Problem
The Issues tab shows issues found during the study, but each issue card doesn't
link back to the specific step/screenshot where it was found. Users can't see
the visual evidence of where the issue occurred.

### Current State

**Backend data** — each Issue row has:
- `step_id` (FK, nullable) — links to the specific step
- `session_id` (FK) — links to the session
- `page_url` — the URL where the issue was found

The `IssueOut` schema exposes all these fields. The `IssueCard` component
already shows `page_url` if available.

**What's missing**: There's no way to click on an issue and jump to the
session replay at the exact step where the issue was found.

### Fix

**Step 1: Add "View in Replay" link to IssueCard**

File: `frontend/src/components/results/issue-card.tsx`

Add a link button to each issue card that navigates to the session replay
at the specific step:

```tsx
// Inside the IssueCard component, add:
{issue.session_id && issue.step_id && (
  <Button variant="ghost" size="sm" asChild>
    <Link href={`/study/${studyId}/session/${issue.session_id}?step=${stepNumber}`}>
      View in Replay
    </Link>
  </Button>
)}
```

**Problem**: The `IssueOut` schema has `step_id` but NOT `step_number`.
To link to the replay at the right step, we need the step number.

**Step 2: Add `step_number` to the IssueOut schema**

File: `backend/app/schemas/session.py`

Add `step_number: int | None = None` to the `IssueOut` schema.

File: `backend/app/db/repositories/session_repo.py`

In `list_issues()`, join with `Step` to get the step_number:
```python
stmt = (
    select(Issue, Step.step_number)
    .outerjoin(Step, Issue.step_id == Step.id)
    .where(Issue.study_id == study_id)
)
```

Or simpler: just add `step_number` as a property/column to `IssueOut` that
is populated from the related `Step`.

**Step 3: Add `step_number` to frontend `IssueOut` type**

File: `frontend/src/types/index.ts`

Add to the `IssueOut` interface:
```ts
step_number?: number | null;
```

**Step 4: Handle the `?step=N` query parameter in session replay**

File: `frontend/src/components/session/session-replay.tsx`

Read the `step` query param and set `currentStep` to that index:
```tsx
const searchParams = useSearchParams();
const initialStep = searchParams.get('step');

useEffect(() => {
  if (initialStep && session?.steps) {
    const idx = session.steps.findIndex(s => s.step_number === Number(initialStep));
    if (idx >= 0) setCurrentStep(idx);
  }
}, [initialStep, session]);
```

### Files to Touch
- `backend/app/schemas/session.py` — add `step_number` to `IssueOut`
- `backend/app/db/repositories/session_repo.py` — join Step to get step_number
- `frontend/src/types/index.ts` — add `step_number` to `IssueOut`
- `frontend/src/components/results/issue-card.tsx` — add "View in Replay" link
- `frontend/src/components/session/session-replay.tsx` — handle `?step=N` query param

### Validation
1. Go to Issues tab on results page
2. Each issue should show the page URL
3. Clicking "View in Replay" should navigate to the session replay at the exact step
4. The screenshot shown should match where the issue was detected

---

## Issue 5: arq Workers Don't Hot-Reload

### Problem
Unlike `uvicorn --reload`, arq workers don't watch for file changes. After
code changes to any backend file, old workers continue running stale code.
This has already caused confusion during development (workers running old
shared-DB code while the backend had the fix).

### Fix

**Option A (Recommended): Use watchfiles with arq**

Create a dev script that uses `watchfiles` (already a uvicorn dependency)
to restart the worker on code changes.

File: `backend/scripts/dev_worker.py` (NEW FILE)
```python
"""Auto-reloading arq worker for development."""
import subprocess
import sys

from watchfiles import run_process


def run_worker():
    """Run the arq worker."""
    subprocess.run(
        [sys.executable, "-c", """
import asyncio
from arq.worker import create_worker
from app.workers.settings import WorkerSettings

async def main():
    worker = create_worker(WorkerSettings)
    await worker.async_run()

asyncio.run(main())
"""],
        cwd=".",
    )


if __name__ == "__main__":
    run_process(
        "app",
        target=run_worker,
        callback=lambda changes: print(f"[dev_worker] Detected changes: {changes}, restarting..."),
    )
```

**Option B: Add a Makefile target**

File: `Makefile`

Add:
```makefile
dev-worker:
	cd backend && watchfiles --filter python 'python -c "import asyncio; from arq.worker import create_worker; from app.workers.settings import WorkerSettings; asyncio.run(create_worker(WorkerSettings).async_run())"' app/
```

**Option C (Simplest): Document the restart requirement**

At minimum, add a prominent note in CLAUDE.md and a comment in the worker
settings file:

File: `backend/app/workers/settings.py` — add at the top:
```python
# NOTE: arq workers do NOT auto-reload on code changes.
# After modifying any backend code, kill and restart workers manually:
#   kill $(pgrep -f "WorkerSettings") && python scripts/dev_worker.py
```

### Files to Touch
- `backend/scripts/dev_worker.py` — NEW FILE, auto-reloading worker script
- `Makefile` — add `dev-worker` target
- `backend/app/workers/settings.py` — add reload warning comment

### Validation
1. Start worker via `python scripts/dev_worker.py`
2. Modify any Python file in `backend/app/`
3. Worker should automatically restart within a few seconds
4. Run a study to confirm the new code is executing

---

## Implementation Order

Recommended order (least dependencies first):

1. **Issue 5** (arq hot-reload) — Do this first so all subsequent fixes are
   picked up automatically without manual worker restarts
2. **Issue 3** (screenshot serving) — Verify proxy works, fix if needed; other
   issues depend on screenshots rendering
3. **Issue 1** (session replay) — Once screenshots serve, verify replay works
   end-to-end
4. **Issue 2** (heatmap click coordinates) — Move click capture before action,
   re-run a study
5. **Issue 4** (issue → step linking) — Adds polish; depends on replay working

## Quick Smoke Test After All Fixes

1. Start backend: `cd backend && uvicorn app.main:app --reload --port 8000`
2. Start worker: `cd backend && python scripts/dev_worker.py`
3. Start frontend: `cd frontend && npm run dev`
4. Create a study: URL `https://www.wikipedia.org`, task "Search for artificial intelligence"
5. Pick 2 personas, run the study
6. **Results page**: Score > 0, task completion > 0%, personas show steps
7. **Replay button**: Click → see screenshot, think-aloud, step timeline, play/pause works
8. **Heatmap button**: Click → see colored dots on canvas where clicks happened
9. **Issues tab**: Shows issues with page URLs, "View in Replay" links work
10. **Report button**: Shows markdown/PDF report
