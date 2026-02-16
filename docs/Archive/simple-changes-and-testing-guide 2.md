# Mirror update summary + simple testing guide

This page explains what changed and how to test it end-to-end in simple steps.

## What changed (plain English)

1. Live session viewer is better.
- You can now pause/resume the live screencast.
- You can change playback speed (0.5x, 1x, 2x).
- You can open fullscreen mode.
- You can see a step counter (`Step X/Y`) while a session runs.
- If no live frame is ready yet, it shows a screenshot fallback.
- When a session ends, it clearly shows `Session ended`.

2. Real-time events now include failover and cost.
- Frontend can receive a `session:browser_failover` event.
- Frontend can receive cost data from `study:complete`.
- Store/state was updated to keep and display this cost data.

3. Completed study screen now shows cost details.
- On completion, users see total cost, API call count, and savings vs cloud (when savings exist).

4. Local Docker mode was added for easier local runs.
- New file: `Dockerfile.local`.
- New Docker profile: `local` in `docker-compose.yml`.
- New Make commands:
  - `make docker-local`
  - `make docker-local-worker`
  - `make health-browser`

5. Reliability and coverage were improved with new tests.
- Added tests for JSON repair.
- Added tests for navigator retry + timeout behavior.
- Added tests for browser pool warm-up + health behavior.
- Added tests for orchestrator cost tracking.
- Added tests for cost tracker.
- Fixed persona API stub test transaction/mocking issues.

## Current test status

As of **February 13, 2026**, full backend tests passed:
- `471 passed`
- `2 skipped`
- `0 failed`

## End-to-end test (non-technical, copy/paste friendly)

## Before you start

1. Install and open Docker Desktop.
2. Make sure Node.js is installed.
3. In project root, create/update `.env` and set at least:
- `ANTHROPIC_API_KEY=...`

Without an API key, the run may fail during AI steps.

## Start the app

1. Open Terminal A in the project root and run:

```bash
make docker-local
```

2. Open Terminal B and run:

```bash
cd frontend
npm install
npm run dev
```

3. Open your browser at:
- `http://localhost:3000/tests`

## Run one real test

1. Click `New Test`.
2. In `Your website`, enter a URL (example: `example.com`).
3. In `What should the testers achieve?`, add at least one task.
4. Select at least one tester persona.
5. Click `Run Test`.

## What to verify on the running page

1. You should see `Running Test...` first, then `Analyzing Results...`, then `Test Complete!`.
2. In each tester card, check live viewer behavior:
- Live view appears (screencast or screenshot fallback).
- Hover over the viewer and test:
  - Pause/Resume button
  - Speed button (`0.5x`, `1x`, `2x`)
  - Fullscreen button
- If available, step indicator appears (`Step X/Y`).
- At the end, viewer shows `Session ended`.
3. Open the `Log` panel:
- You should see normal progress messages.
- If failover happens, you should see a warning message about browser failover.

## What to verify on completion

1. In the green completion summary, confirm:
- Score is shown.
- Cost is shown (example format: `Cost: $...`).
- API calls count is shown.
- Savings badge appears when savings are greater than zero.

## Optional health check

In another terminal, run:

```bash
curl -s http://localhost:8000/api/v1/health/browser
```

You should get JSON showing browser pool health (or `not_initialized` before first run).

## Stop everything

1. In Terminal A, press `Ctrl + C`.
2. Then run:

```bash
docker compose --profile local down
```
