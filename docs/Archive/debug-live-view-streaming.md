# Debug Plan: Live View Streaming Not Reaching Frontend

## What Works (Confirmed)

1. **Browserbase session creation** — 201 Created, connectUrl returned
2. **Live view URL resolution** — `debuggerFullscreenUrl` fetched successfully
3. **Playwright CDP connection** — browser connects, pages load, navigation runs
4. **Step recording** — steps saved to DB, screenshots captured
5. **Redis PUBLISH** — step_recorder calls `redis.publish(channel, event)` for every step
6. **Worker logging** — all steps logged with `Published step: ... live_view=True`
7. **WebSocket connection** — backend logs "WebSocket accepted" and "connection open"

## What's Broken

The frontend running page (`/study/{id}/running`) shows **blank persona cards** — no screenshots, no think-aloud text, no live iframe, stuck at "Step 0 / Starting...".

Despite the backend publishing 6 step events to Redis pubsub, the frontend never updates.

## Root Cause Hypothesis

The WebSocket is connected but **the subscribe message may not be reaching the backend**, or the Redis pubsub listener may not be forwarding events. The chain is:

```
step_recorder.publish_step_event()
  → redis.publish("study:{id}", event_json)           ✅ CONFIRMED working
    → WebSocket handler's listen_redis() task
      → websocket.send_json(payload)                   ❓ UNCONFIRMED
        → browser receives WS message
          → Zustand store handleWsMessage()
            → UI re-renders                            ❌ NOT HAPPENING
```

## Likely Causes (Priority Order)

### 1. WebSocket subscribe timing race
The `useWebSocket(studyId)` hook runs when the component mounts. But the WebSocket singleton (`getWsClient()`) might already have a stale connection from a previous page. The new `subscribe(studyId)` message might be sent while the old Redis pubsub subscription is still active, or the backend might drop it.

**How to verify**: Add `console.log` to `ws-client.ts` in `subscribe()` and check browser console.

### 2. WebSocket connected but subscribe message never sent
In `ws-client.ts`, `subscribe()` only sends if `ws.readyState === WebSocket.OPEN`. If the WS is still connecting when subscribe is called, it stores the ID for later. But the `onopen` handler might fire before `subscribe()` is called (race condition in useEffect).

**How to verify**: Add logging in `useWebSocket` hook:
```typescript
useEffect(() => {
  console.log('[WS-HOOK] Connecting and subscribing to', studyId);
  client.connect();
  if (studyId) client.subscribe(studyId);
  // ...
}, [studyId, handleWsMessage]);
```

### 3. Backend WebSocket handler drops after first subscribe
In `progress.py`, the handler does `await websocket.receive_json()` to get the initial subscribe message, then enters a `while True` loop for subsequent messages. If the client sends a second subscribe (e.g., from a re-render), this should work. But if any error occurs in the Redis listener task, it silently dies.

**How to verify**: Add error logging to `listen_redis()`:
```python
async def listen_redis():
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                payload = json.loads(message["data"])
                logger.info("WS forwarding: %s", payload.get("type"))
                await websocket.send_json(payload)
    except Exception as e:
        logger.error("Redis listener died: %s", e)
```

### 4. Zustand store `handleWsMessage` not called
The `useWebSocket` hook gets `handleWsMessage` from the store. If the component re-renders and the reference changes, the effect might unsubscribe and resubscribe, causing a brief window where messages are missed.

**How to verify**: Add `console.log` in `handleWsMessage` at the top of the switch statement.

## Quickest Fix: Add Server-Side Logging + Frontend Console Logging

### Backend — `backend/app/api/ws/progress.py`

Add logging to confirm subscribe and message forwarding:

```python
# After receiving subscribe message:
logger.info("WS subscribed: study=%s", study_id)

# In listen_redis():
logger.info("WS forwarding event: type=%s to study=%s", payload.get("type"), study_id)
```

### Frontend — `frontend/src/lib/ws-client.ts`

The file already has `console.log('[WS] Message:', msg.type)` on line 40. Check browser DevTools console for these logs during a study run.

### Frontend — `frontend/src/stores/study-store.ts`

Add at the top of `handleWsMessage`:
```typescript
console.log('[STORE] handleWsMessage:', msg.type, msg);
```

## Alternative: Polling-Based Live View (No WebSocket Needed)

If WebSocket debugging takes too long, the `LiveSessionStateStore` (added by Codex) already stores durable session state in Redis hashes. The frontend could **poll this state** instead of relying on WebSocket:

1. Add a REST endpoint: `GET /api/v1/studies/{id}/live-state`
2. It reads from `LiveSessionStateStore.get_study_snapshot(study_id)`
3. Frontend polls this every 1-2 seconds (like it already does for sessions)
4. This bypasses the entire WebSocket/pubsub chain

This is the **most reliable fix** since polling already works (the session list polls work fine).

## Files to Modify

| File | Change |
|------|--------|
| `backend/app/api/ws/progress.py` | Add subscribe + forwarding logging |
| `frontend/src/lib/ws-client.ts` | Already has logging, verify in browser console |
| `frontend/src/stores/study-store.ts` | Add console.log in handleWsMessage |
| `backend/app/api/v1/studies.py` (new endpoint) | Optional: polling-based live state endpoint |

## How to Test

1. Open browser DevTools → Console tab
2. Start a new study
3. Watch for `[WS] Connected`, `[WS] Subscribing to ...`, `[WS] Message: session:step`
4. If no `[WS] Message` logs appear, the WebSocket is not receiving events
5. Check backend logs for "WS forwarding event" messages
6. If backend shows forwarding but browser doesn't receive, it's a network/proxy issue
