# Plan: Browserbase Live View — Watch AI Personas Navigate in Real-Time

> **Goal**: During the "Running" phase, embed live browser iframes on the
> running page so users can watch each AI persona navigate the target site
> in real-time. This transforms Mirror from a "wait for results" tool into
> an interactive, watchable experience.

---

## Architecture Overview

```
Current flow (boring):
  User clicks "Run" → progress bar → wait → results

New flow (interactive):
  User clicks "Run" → sees LIVE browser windows for each persona
  → watches them click, type, scroll → real-time think-aloud bubbles
  → browsers close → analysis → results
```

### How It Works

1. Backend creates a **separate Browserbase session** per persona (not shared)
2. For each session, calls Browserbase debug API to get a **live view URL**
3. Publishes that URL to the frontend via **WebSocket** (existing Redis pubsub)
4. Frontend renders an **iframe per persona** with `pointer-events: none` (read-only)
5. Users see the actual browser with the AI navigating — clicks, typing, scrolling
6. When a persona finishes, the iframe shows a "completed" overlay

---

## Critical Constraint: Free Tier = 1 Concurrent Browser

Browserbase free tier limits:
- **1 concurrent browser** (personas MUST run sequentially, not parallel)
- **1 hour/month** total browser time
- **15 min max** per session
- **5 sessions/min** creation rate

This means on the free tier, persona sessions run **one at a time**.
On Developer plan ($20/mo), you get **25 concurrent** — full parallel.

### How to Handle This

The code must support both modes:
- **Free tier**: `MAX_CONCURRENT_SESSIONS=1` — personas run sequentially,
  UI shows one live browser at a time, others show "Waiting..."
- **Paid tier**: `MAX_CONCURRENT_SESSIONS=5` — parallel browsers side by side

The existing `asyncio.Semaphore(max_concurrent)` in the orchestrator
already handles this — just set the env var to `1` for free tier.

---

## Implementation: 6 Changes

### Change 1: Refactor BrowserPool to Create Per-Session Browserbase Sessions

**File**: `backend/app/browser/pool.py`

**Current behavior**: `_connect_browserbase()` creates ONE CDP connection:
```python
cdp_url = f"wss://connect.browserbase.com?apiKey={api_key}&projectId={project_id}"
self._browser = await self._playwright.chromium.connect_over_cdp(cdp_url)
```
Then `acquire()` creates contexts on that single browser. All contexts share
one Browserbase session — so there's only ONE live view URL for all personas.

**New behavior**: `acquire()` creates a NEW Browserbase session per persona,
each with its own CDP connection and its own live view URL.

**Replace the BrowserPool class with this approach**:

```python
"""Playwright browser pool — per-session Browserbase or local fallback."""

import asyncio
import logging
import os
from dataclasses import dataclass, field
from typing import Any

import httpx
from playwright.async_api import Browser, BrowserContext, Page, Playwright, async_playwright

logger = logging.getLogger(__name__)

BB_API_URL = "https://api.browserbase.com/v1"

# Keep existing ViewportPreset and VIEWPORT_PRESETS as-is (no changes)


@dataclass
class BrowserSession:
    """Tracks a single browser session (Browserbase or local context)."""
    context: BrowserContext
    browser: Browser | None = None  # Only set for Browserbase (per-session browser)
    bb_session_id: str | None = None  # Browserbase session ID
    live_view_url: str | None = None  # Live view iframe URL


@dataclass
class BrowserPool:
    max_contexts: int = 5
    _playwright: Playwright | None = field(default=None, init=False, repr=False)
    _local_browser: Browser | None = field(default=None, init=False, repr=False)
    _semaphore: asyncio.Semaphore = field(init=False, repr=False)
    _active_sessions: set[BrowserSession] = field(default_factory=set, init=False, repr=False)
    _use_browserbase: bool = field(default=False, init=False, repr=False)
    _bb_api_key: str | None = field(default=None, init=False, repr=False)
    _bb_project_id: str | None = field(default=None, init=False, repr=False)

    def __post_init__(self) -> None:
        self._semaphore = asyncio.Semaphore(self.max_contexts)

    async def initialize(self) -> None:
        if self._playwright is not None:
            return
        self._playwright = await async_playwright().start()

        self._bb_api_key = os.getenv("BROWSERBASE_API_KEY")
        self._bb_project_id = os.getenv("BROWSERBASE_PROJECT_ID")

        if self._bb_api_key and self._bb_project_id:
            self._use_browserbase = True
            logger.info("BrowserPool: Browserbase mode (project=%s)", self._bb_project_id)
        else:
            # Local fallback — launch one shared browser
            self._local_browser = await self._playwright.chromium.launch(
                headless=True,
                args=["--disable-gpu", "--disable-dev-shm-usage", "--no-sandbox"],
            )
            logger.info("BrowserPool: Local Chromium mode (max_contexts=%d)", self.max_contexts)

    async def acquire(
        self,
        viewport: str = "desktop",
        extra_args: dict[str, Any] | None = None,
    ) -> BrowserSession:
        """Acquire a browser session.

        Browserbase mode: creates a NEW Browserbase session with its own
        live view URL. Local mode: creates a context on the shared browser.
        """
        if self._playwright is None:
            raise RuntimeError("BrowserPool not initialized")

        await self._semaphore.acquire()

        preset = VIEWPORT_PRESETS.get(viewport, VIEWPORT_PRESETS["desktop"])
        context_args = {
            "viewport": {"width": preset.width, "height": preset.height},
            "device_scale_factor": preset.device_scale_factor,
            "is_mobile": preset.is_mobile,
            "has_touch": preset.has_touch,
            "ignore_https_errors": True,
        }
        if preset.user_agent:
            context_args["user_agent"] = preset.user_agent
        if extra_args:
            context_args.update(extra_args)

        try:
            if self._use_browserbase:
                session = await self._acquire_browserbase(preset, context_args)
            else:
                session = await self._acquire_local(context_args)
        except Exception:
            self._semaphore.release()
            raise

        self._active_sessions.add(session)
        return session

    async def _acquire_browserbase(
        self, preset: ViewportPreset, context_args: dict
    ) -> BrowserSession:
        """Create a new Browserbase session and connect Playwright to it."""
        # 1. Create session via REST API
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{BB_API_URL}/sessions",
                headers={
                    "X-BB-API-Key": self._bb_api_key,
                    "Content-Type": "application/json",
                },
                json={
                    "projectId": self._bb_project_id,
                    "browserSettings": {
                        "viewport": {
                            "width": preset.width,
                            "height": preset.height,
                        },
                        "solveCaptchas": True,
                        "recordSession": True,
                    },
                },
                timeout=30.0,
            )
            resp.raise_for_status()
            session_data = resp.json()

        bb_session_id = session_data["id"]
        connect_url = session_data["connectUrl"]

        # 2. Connect Playwright via CDP
        browser = await self._playwright.chromium.connect_over_cdp(connect_url)
        # Use the default context (Browserbase creates one for recording)
        context = browser.contexts[0] if browser.contexts else await browser.new_context(**context_args)

        # 3. Get live view URL
        live_view_url = None
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{BB_API_URL}/sessions/{bb_session_id}/debug",
                    headers={"X-BB-API-Key": self._bb_api_key},
                    timeout=10.0,
                )
                resp.raise_for_status()
                debug_data = resp.json()
                live_view_url = debug_data.get("debuggerFullscreenUrl")
                if live_view_url:
                    live_view_url += "&navbar=false"
        except Exception as e:
            logger.warning("Failed to get live view URL: %s", e)

        logger.info(
            "Browserbase session created: id=%s, live_view=%s",
            bb_session_id, bool(live_view_url),
        )

        return BrowserSession(
            context=context,
            browser=browser,
            bb_session_id=bb_session_id,
            live_view_url=live_view_url,
        )

    async def _acquire_local(self, context_args: dict) -> BrowserSession:
        """Create a local browser context (no live view)."""
        assert self._local_browser is not None
        context = await self._local_browser.new_context(**context_args)
        return BrowserSession(context=context)

    async def release(self, session: BrowserSession) -> None:
        """Release a browser session back to the pool."""
        try:
            await session.context.close()
        except Exception:
            logger.warning("Error closing browser context", exc_info=True)

        # For Browserbase: close the per-session browser and release the session
        if session.browser:
            try:
                await session.browser.close()
            except Exception:
                pass

        if session.bb_session_id:
            try:
                async with httpx.AsyncClient() as client:
                    await client.post(
                        f"{BB_API_URL}/sessions/{session.bb_session_id}",
                        headers={
                            "X-BB-API-Key": self._bb_api_key,
                            "Content-Type": "application/json",
                        },
                        json={
                            "projectId": self._bb_project_id,
                            "status": "REQUEST_RELEASE",
                        },
                        timeout=10.0,
                    )
            except Exception as e:
                logger.warning("Failed to release Browserbase session: %s", e)

        self._active_sessions.discard(session)
        self._semaphore.release()

    # Keep existing shutdown(), active_count, is_initialized, is_cloud properties
```

**Key changes**:
- `acquire()` returns a `BrowserSession` (not just `BrowserContext`)
- Browserbase mode creates one session per `acquire()` call via REST API
- Each `BrowserSession` has its own `live_view_url`
- `release()` calls `REQUEST_RELEASE` on the Browserbase session to free billing
- Local mode still uses a shared browser (no live view, same as before)

**Dependencies to add**: `httpx` (for async HTTP to Browserbase API)
```bash
cd backend && pip install httpx
# Add to pyproject.toml dependencies
```

---

### Change 2: Update Orchestrator to Pass Live View URLs via WebSocket

**File**: `backend/app/core/orchestrator.py`

The `_run_navigation_sessions()` method needs to:
1. Receive the `BrowserSession` object (not just `BrowserContext`)
2. Publish the `live_view_url` to Redis so the frontend can show it
3. Publish a "session ended" event when the persona finishes

**In `run_one()`, after acquiring the browser session**:

```python
async def run_one(
    session: Any, persona_dict: dict[str, Any], task_desc: str
) -> NavigationResult:
    async with semaphore:
        viewport = persona_dict.get("device_preference", "desktop")
        browser_session = await pool.acquire(viewport=viewport)  # Returns BrowserSession now
        try:
            # Publish live view URL if available
            if browser_session.live_view_url:
                await self._publish_event(study_id, {
                    "type": "session:live_view",
                    "session_id": str(session.id),
                    "persona_name": persona_dict.get("name", "Unknown"),
                    "live_view_url": browser_session.live_view_url,
                })

            async with self.db_factory() as persona_db:
                # ... existing recorder + navigation code ...
                # Use browser_session.context instead of ctx
                result = await self._navigator.navigate_session(
                    ...
                    browser_context=browser_session.context,  # Changed from ctx
                    ...
                )
                # ... existing status update code ...

            # Publish session ended (browser closing)
            await self._publish_event(study_id, {
                "type": "session:browser_closed",
                "session_id": str(session.id),
            })

            return result
        finally:
            await pool.release(browser_session)  # Pass BrowserSession, not ctx
```

**Also update all callers** — anywhere that currently does `pool.acquire()` and
gets back a `BrowserContext`, change to expect `BrowserSession` and use
`browser_session.context` for the Playwright context.

---

### Change 3: Add New WebSocket Event Types

**File**: `frontend/src/types/ws.ts`

Add two new event types:

```typescript
export interface WsSessionLiveView {
  type: 'session:live_view';
  session_id: string;
  persona_name: string;
  live_view_url: string;
}

export interface WsSessionBrowserClosed {
  type: 'session:browser_closed';
  session_id: string;
}

// Update the union type:
export type WsServerMessage =
  | WsStudyProgress
  | WsSessionStep
  | WsSessionComplete
  | WsSessionLiveView       // NEW
  | WsSessionBrowserClosed  // NEW
  | WsStudyAnalyzing
  | WsStudyComplete
  | WsStudyError;
```

---

### Change 4: Update Zustand Store to Track Live View URLs

**File**: `frontend/src/stores/study-store.ts`

Add `live_view_url` and `browser_active` to the `PersonaProgress` interface:

```typescript
interface PersonaProgress {
  persona_name: string;
  session_id: string;
  step_number: number;
  think_aloud: string;
  screenshot_url: string;
  emotional_state: string;
  action: string;
  task_progress: number;
  completed: boolean;
  total_steps: number;
  live_view_url: string | null;    // NEW
  browser_active: boolean;          // NEW
}
```

Add handlers in `handleWsMessage`:

```typescript
case 'session:live_view': {
  const persona: PersonaProgress = {
    persona_name: msg.persona_name,
    session_id: msg.session_id,
    step_number: 0,
    think_aloud: 'Starting navigation...',
    screenshot_url: '',
    emotional_state: 'curious',
    action: 'navigating',
    task_progress: 0,
    completed: false,
    total_steps: 0,
    live_view_url: msg.live_view_url,
    browser_active: true,
  };
  set({
    activeStudy: {
      ...current,
      personas: { ...current.personas, [msg.session_id]: persona },
    },
  });
  break;
}

case 'session:browser_closed': {
  if (current.personas[msg.session_id]) {
    set({
      activeStudy: {
        ...current,
        personas: {
          ...current.personas,
          [msg.session_id]: {
            ...current.personas[msg.session_id],
            browser_active: false,
          },
        },
      },
    });
  }
  break;
}
```

Also update the existing `session:step` case to preserve `live_view_url`
and `browser_active`:

```typescript
case 'session:step': {
  const existing = current.personas[step.session_id];
  const persona: PersonaProgress = {
    ...existing, // Preserve live_view_url and browser_active
    persona_name: step.persona_name,
    session_id: step.session_id,
    step_number: step.step_number,
    think_aloud: step.think_aloud,
    screenshot_url: step.screenshot_url,
    emotional_state: step.emotional_state,
    action: step.action,
    task_progress: step.task_progress,
    completed: false,
    total_steps: step.step_number,
    live_view_url: existing?.live_view_url ?? null,
    browser_active: existing?.browser_active ?? true,
  };
  // ...
}
```

---

### Change 5: Switch Running Page from Polling to WebSocket

**File**: `frontend/src/components/study/study-progress.tsx`

The running page currently uses **polling** (`refetchInterval: 2000`).
It should use the **existing WebSocket hook** instead, which is already
fully implemented but not wired up.

Replace the polling queries with WebSocket subscription:

```typescript
import { useWebSocket } from '@/hooks/use-websocket';
import { useStudyStore } from '@/stores/study-store';

export function StudyProgress({ studyId }: StudyProgressProps) {
  const router = useRouter();
  const redirected = useRef(false);

  // Initialize WebSocket subscription
  const { connectionState } = useWebSocket(studyId);
  const activeStudy = useStudyStore((s) => s.activeStudy);
  const initStudy = useStudyStore((s) => s.initStudy);

  useEffect(() => {
    initStudy(studyId);
  }, [studyId, initStudy]);

  // KEEP the polling query as a FALLBACK for initial load and status checks
  const { data: study, isLoading } = useQuery({
    queryKey: ['study-progress', studyId],
    queryFn: () => api.getStudy(studyId),
    refetchInterval: 5000, // Less frequent, just for status/fallback
    enabled: !!studyId,
  });

  // ... rest uses activeStudy from Zustand store for real-time data
  // ... and study from polling for status checks (complete/failed)
```

This way the running page gets real-time step updates AND live view URLs
via WebSocket, with polling as a fallback for overall study status.

---

### Change 6: Add Live Browser Iframes to the Running Page UI

**File**: `frontend/src/components/study/persona-progress-card.tsx`

This is the per-persona card shown on the running page. Add an iframe
that shows the Browserbase live view when available.

**New component**: `frontend/src/components/study/live-browser-view.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';

interface LiveBrowserViewProps {
  liveViewUrl: string | null;
  browserActive: boolean;
  personaName: string;
}

export function LiveBrowserView({
  liveViewUrl,
  browserActive,
  personaName,
}: LiveBrowserViewProps) {
  const [disconnected, setDisconnected] = useState(false);

  // Listen for Browserbase disconnect events
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data === 'browserbase-disconnected') {
        setDisconnected(true);
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!liveViewUrl) {
    // Local Chromium mode — no live view available
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed bg-muted/30">
        <p className="text-sm text-muted-foreground">
          Live view requires Browserbase.
          <br />
          Screenshots will appear in replay after completion.
        </p>
      </div>
    );
  }

  if (!browserActive || disconnected) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border bg-muted/30">
        <div className="text-center">
          <p className="text-sm font-medium">Session ended</p>
          <p className="text-xs text-muted-foreground">
            {personaName} has finished navigating
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border">
      <iframe
        src={liveViewUrl}
        sandbox="allow-same-origin allow-scripts"
        allow="clipboard-read; clipboard-write"
        style={{ pointerEvents: 'none' }}
        className="h-[300px] w-full"
        title={`Live browser view for ${personaName}`}
      />
      <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-red-500/90 px-2.5 py-1">
        <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
        <span className="text-xs font-medium text-white">LIVE</span>
      </div>
    </div>
  );
}
```

**Update**: `frontend/src/components/study/persona-progress-card.tsx`

Add the `LiveBrowserView` above the think-aloud bubble:

```typescript
interface PersonaProgressCardProps {
  personaName: string;
  stepNumber: number;
  totalSteps: number;
  thinkAloud: string;
  screenshotUrl: string;
  emotionalState: string;
  action: string;
  taskProgress: number;
  completed: boolean;
  liveViewUrl?: string | null;     // NEW
  browserActive?: boolean;          // NEW
}

export function PersonaProgressCard({
  personaName,
  stepNumber,
  thinkAloud,
  emotionalState,
  action,
  taskProgress,
  completed,
  liveViewUrl,
  browserActive,
}: PersonaProgressCardProps) {
  return (
    <Card className={completed ? 'opacity-75' : ''}>
      <CardContent className="space-y-3 p-4">
        {/* Header with persona name, emoji, action badge — keep as-is */}
        ...

        {/* NEW: Live browser iframe */}
        {liveViewUrl !== undefined && (
          <LiveBrowserView
            liveViewUrl={liveViewUrl ?? null}
            browserActive={browserActive ?? false}
            personaName={personaName}
          />
        )}

        <ProgressBar value={taskProgress} showLabel />

        {thinkAloud && (
          <ThinkAloudBubble text={thinkAloud} emotionalState={...} />
        )}

        {completed && (
          <p className="text-xs font-medium text-green-600">Completed</p>
        )}
      </CardContent>
    </Card>
  );
}
```

**Update**: `frontend/src/components/study/study-progress.tsx`

Pass the live view data from Zustand store to the cards:

```typescript
{/* When using WebSocket data */}
{activeStudy && Object.values(activeStudy.personas).map((persona) => (
  <PersonaProgressCard
    key={persona.session_id}
    personaName={persona.persona_name}
    stepNumber={persona.step_number}
    totalSteps={persona.total_steps}
    thinkAloud={persona.think_aloud}
    screenshotUrl={persona.screenshot_url}
    emotionalState={persona.emotional_state}
    action={persona.action}
    taskProgress={persona.task_progress}
    completed={persona.completed}
    liveViewUrl={persona.live_view_url}       // NEW
    browserActive={persona.browser_active}     // NEW
  />
))}
```

---

## File Summary

| File | Change |
|------|--------|
| `backend/app/browser/pool.py` | **Rewrite** — per-session Browserbase via REST API, `BrowserSession` return type, live view URL fetch, `REQUEST_RELEASE` on cleanup |
| `backend/app/core/orchestrator.py` | **Edit** — use `BrowserSession`, publish `session:live_view` and `session:browser_closed` events |
| `frontend/src/types/ws.ts` | **Edit** — add `WsSessionLiveView` and `WsSessionBrowserClosed` types |
| `frontend/src/stores/study-store.ts` | **Edit** — add `live_view_url` and `browser_active` to `PersonaProgress`, handle new events |
| `frontend/src/components/study/study-progress.tsx` | **Edit** — wire up `useWebSocket` hook, pass live view data to cards |
| `frontend/src/components/study/persona-progress-card.tsx` | **Edit** — accept and render `liveViewUrl` and `browserActive` props |
| `frontend/src/components/study/live-browser-view.tsx` | **New** — iframe wrapper with LIVE badge, disconnect detection, fallback states |
| `backend/pyproject.toml` | **Edit** — add `httpx` dependency |

---

## Implementation Order

1. **Add `httpx` dependency** to backend
2. **Refactor `pool.py`** — the biggest change, swap shared browser for per-session
3. **Update orchestrator** — use `BrowserSession`, publish live view events
4. **Add WS types** — `session:live_view`, `session:browser_closed`
5. **Update Zustand store** — handle new events, track live view URLs
6. **Wire up WebSocket** in the running page (replace pure polling)
7. **Create `LiveBrowserView`** component
8. **Update `PersonaProgressCard`** — render iframe

---

## Environment Variables

Add to `backend/.env`:
```bash
BROWSERBASE_API_KEY=bb_...         # Your Browserbase API key
BROWSERBASE_PROJECT_ID=proj_...    # Your Browserbase project ID
MAX_CONCURRENT_SESSIONS=1          # Set to 1 for free tier
```

---

## Testing

1. **Without Browserbase** (local mode): Everything should work exactly as
   before. `LiveBrowserView` shows "Live view requires Browserbase" fallback.
   No regressions.

2. **With Browserbase free tier**:
   - Set `MAX_CONCURRENT_SESSIONS=1` in `.env`
   - Create a study with 2 personas
   - On the running page: first persona shows live iframe with "LIVE" badge
   - Second persona shows "Waiting..." until first completes
   - After first finishes: iframe shows "Session ended", second starts with new iframe
   - Both complete → redirects to results

3. **Verification**:
   - Check Browserbase dashboard: sessions should show as `COMPLETED` (not `TIMED_OUT`)
   - Backend logs: `Browserbase session created: id=..., live_view=True`
   - No leaked sessions (every `acquire` has matching `release` with `REQUEST_RELEASE`)

---

## Cost Awareness

| Plan | Concurrent | Hours/mo | Good For |
|------|-----------|----------|----------|
| Free | 1 | 1 hr | Dev/demo — ~4 studies/month |
| Developer ($20) | 25 | 100 hrs | Real usage — ~600 studies/month |
| Startup ($99) | 100 | 500 hrs | Production |

The code handles both gracefully. Without Browserbase keys, it falls
back to local Chromium with no live view (screenshots-only replay after).
