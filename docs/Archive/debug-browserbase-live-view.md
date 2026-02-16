# Debug Plan: Browserbase Live View + CAPTCHA Solving

## Current Status

The Browserbase integration is **partially working** but has 3 bugs that cause the running page to appear stuck at "Step 0 / Starting...".

## Root Cause Chain

When a user hits "Run Test", this happens:

1. API creates study + sessions in DB, enqueues arq job → **works**
2. arq worker picks up the job → **works**
3. Worker calls `BrowserPool.acquire()` → tries Browserbase → **FAILS SILENTLY**
4. Worker crashes, leaves stale `arq:in-progress:*` marker in Redis
5. Worker polling loop sees in-progress marker → **skips the job forever**
6. Frontend polls for session data → sees status "running" but no step data → stuck at Step 0

## The 3 Bugs

### Bug 1: `pool.py` Browserbase API needs retry on 429

**File**: `backend/app/browser/pool.py` — `_acquire_browserbase()` method

The Browserbase free tier has aggressive rate limits (5 sessions/min, 1 concurrent). When the API returns `429 Too Many Requests`, our code does `resp.raise_for_status()` which throws an exception. The worker crashes.

**Fix**: Add retry with exponential backoff on 429 responses in `_acquire_browserbase()`:

```python
async def _acquire_browserbase(self, preset, context_args):
    max_retries = 3
    for attempt in range(max_retries):
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{BB_API_URL}/sessions",
                headers={...},
                json={...},
                timeout=30.0,
            )
            if resp.status_code == 429:
                wait = (2 ** attempt) * 5  # 5s, 10s, 20s
                logger.warning("Browserbase rate limited, waiting %ds...", wait)
                await asyncio.sleep(wait)
                continue
            resp.raise_for_status()
            session_data = resp.json()
            break
    else:
        raise RuntimeError("Browserbase rate limit exceeded after retries")
    # ... rest of method
```

Also, the Browserbase API returns **201** for session creation, not 200. The current `resp.raise_for_status()` handles this fine (201 is not an error), but the code comment should note this.

### Bug 2: Worker silently swallows all exceptions — no logging

**File**: `backend/app/core/orchestrator.py` — `run_study()` method

The `run_study()` method has a try/except that catches all exceptions and calls `_publish_event(study_id, {"type": "study:error", ...})`. But the Redis publish also silently fails if the Redis connection has issues, meaning errors vanish completely.

The worker's arq task wrapper in `backend/app/workers/tasks.py` likely also catches exceptions but doesn't print them.

**Fix**: Check `backend/app/workers/tasks.py` and ensure exceptions are logged with full tracebacks:

```python
async def run_study_task(ctx, study_id: str):
    try:
        # ... existing code ...
    except Exception as e:
        logger.exception("Study task failed for %s", study_id)  # Use .exception() for traceback
        raise  # Re-raise so arq marks it as failed
```

### Bug 3: Stale arq in-progress markers persist across worker restarts

**File**: `backend/scripts/dev_worker.py`

When the worker process is killed (SIGKILL, crash, etc.), arq leaves behind `arq:in-progress:{job_id}` keys in Redis. The new worker sees these and thinks another worker is handling the job, so it skips it forever.

**Partial fix already applied**: `dev_worker.py` now has `_clear_stale_jobs()` that runs on startup. But this deletes ALL in-progress markers, which is only safe in dev (single worker).

**Current state of the fix** (already in `dev_worker.py`):
```python
def _clear_stale_jobs():
    r = redis.Redis()
    stale = r.keys("arq:in-progress:*")
    if stale:
        for key in stale:
            r.delete(key)
        for key in r.keys("arq:retry:*"):
            r.delete(key)
```

This should work but verify it runs before `create_worker()`.

## Files to Check/Modify

| File | What to do |
|------|-----------|
| `backend/app/browser/pool.py` | Add retry with backoff on 429 in `_acquire_browserbase()`. Also add `await asyncio.sleep(wait)` import if needed. `asyncio` is already imported. |
| `backend/app/workers/tasks.py` | Add `logger.exception()` for full traceback logging. Verify exceptions are re-raised. |
| `backend/app/core/orchestrator.py` | Verify `run_study()` exception handler logs the full traceback (not just `str(e)`). |
| `backend/scripts/dev_worker.py` | Verify `_clear_stale_jobs()` runs before worker starts (already added). |

## How to Verify

1. Kill worker: `pkill -f dev_worker`
2. Clear Redis stale state: `redis-cli KEYS "arq:in-progress:*" | xargs redis-cli DEL`
3. Wait 60 seconds for Browserbase rate limit to reset
4. Start worker: `cd backend && source .venv/bin/activate && PYTHONUNBUFFERED=1 python scripts/dev_worker.py`
5. Create new study from `localhost:3000`
6. Watch worker output — should see "Browserbase session created: id=..., live_view=True"
7. Watch running page — should show iframe with LIVE badge

## Quick Test: Is Browserbase Reachable?

```bash
cd backend && source .venv/bin/activate && python -c "
import httpx
from app.config import settings
resp = httpx.post(
    'https://api.browserbase.com/v1/sessions',
    headers={'X-BB-API-Key': settings.BROWSERBASE_API_KEY, 'Content-Type': 'application/json'},
    json={'projectId': settings.BROWSERBASE_PROJECT_ID, 'browserSettings': {'solveCaptchas': True}},
    timeout=30,
)
print(f'Status: {resp.status_code}')
print(resp.text[:200])
"
```

If this returns 201 → Browserbase is working, the bug is in the async flow.
If this returns 429 → Rate limited, wait 60 seconds and retry.
If this returns 401/403 → API key is invalid or expired.

## Architecture Context

```
User hits "Run Test"
  → POST /api/v1/studies/{id}/run  (API server, uvicorn)
    → enqueues arq job in Redis
      → arq worker picks up job
        → orchestrator.run_study()
          → pool.acquire()  ← THIS IS WHERE IT FAILS (429 from Browserbase)
            → _acquire_browserbase()
              → POST https://api.browserbase.com/v1/sessions
              → resp.raise_for_status()  ← THROWS on 429
          → exception bubbles up, worker crashes
          → stale arq:in-progress marker left in Redis
          → worker can't re-pick the job
          → frontend stuck at Step 0
```

## Environment

- Browserbase API key: `bb_live_vwx40T4mHLsGwcnTaZvLJgdhG58` (confirmed valid, 201 response)
- Project ID: `5788a25a-39b4-430d-81c3-03d575fad9f4`
- Free tier limits: 1 concurrent session, 5 sessions/min, 1 hour/month
- Keys are in `backend/.env` and loaded via `app/config.py` (pydantic Settings)
- `pool.py` was updated to read from `settings` instead of `os.getenv()` (previous bug, now fixed)
