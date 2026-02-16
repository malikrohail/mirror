# Mirror — Pre-Push Task List

> Hackathon committee submission checklist. Last updated: 2026-02-13

---

## P0 — Must Fix Before Push

- [x] **Clean up macOS duplicate files** — ~~Remove all `" 2"` suffix files~~ Done: 23 files deleted
- [x] **Secure .env** — Already gitignored and not tracked
- [ ] **Commit all unstaged work** — 23+ modified files on `frontend` branch are uncommitted (backend API changes, frontend pages, components, styles)
- [ ] **Merge `frontend` branch into `main`** — Main branch is behind; all recent work lives on `frontend`
- [x] **Add root README.md** — Done: overview, features, tech stack, architecture, quick start, LLM pipeline, project structure

## P1 — Should Fix Before Push

- [ ] **Frontend: Heatmap page preview** — `click-heatmap.tsx` shows "Page preview area" placeholder text instead of actual screenshot + overlay
- [ ] **Frontend: Persona Builder page** — Sidebar links to `/personas/builder` but the page doesn't exist
- [ ] **Frontend: Docs page** — Currently returns "Coming soon" stub
- [ ] **Frontend Dockerfile** — No Dockerfile for Next.js (backend has one, docker-compose references it but frontend is missing)
- [ ] **Replace boilerplate frontend/README.md** — Still has the default create-next-app text

## P2 — Nice to Have

- [ ] **CI/CD workflows** — `.github/actions/mirror-test/` exists but no actual `.github/workflows/` pipeline for automated tests
- [ ] **Add LICENSE file** — No license in repo
- [ ] **End-to-end smoke test** — Verify full pipeline: create study -> run -> navigate -> analyze -> report (requires Anthropic API key + Browserbase)
- [ ] **Deployment config** — No Vercel/Railway/Render config for live demo hosting
- [ ] **Clean up docs/** — Several debug/fix-plan docs in root of docs/ could be moved to Archive

---

## Current State Summary

| Layer | Status | Notes |
|-------|--------|-------|
| **Backend API** | ~90% built | FastAPI + SQLAlchemy models + Pydantic schemas + LLM pipeline all implemented |
| **Backend Core** | ~85% built | Orchestrator, navigator, analyzer, synthesizer, heatmap, report builder exist |
| **Database** | Ready | PostgreSQL + Alembic migrations + repositories |
| **Frontend UI** | ~95% built | All major pages/components connected to real backend via TanStack Query |
| **WebSocket** | Implemented | Auto-reconnecting client + Redis pub/sub hub |
| **State Mgmt** | Implemented | Zustand store + React Query caching |
| **Tests** | 15 test files | Backend pytest suite exists |
| **Docker** | Partial | Compose has postgres/redis/backend/worker — missing frontend |
| **Docs** | Internal only | Rich CLAUDE.md but no public README |
| **CI/CD** | Not set up | Custom action defined, no workflows |
