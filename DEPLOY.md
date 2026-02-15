# Mirror Production Deployment Plan

**Domain:** `miror.tech`
**Server:** DigitalOcean Droplet — 8 GB RAM / 2 Intel vCPUs / 160 GB Disk / NYC1 (Ubuntu 24.04 LTS)
**Droplet IP:** `157.230.215.4`
**SSH Key:** `~/.ssh/id_ed25519` (already on the droplet)
**Estimated deploy time:** ~10 minutes

---

## Overview

This plan deploys the full Mirror stack to DigitalOcean with HTTPS on `miror.tech`. The stack runs 6 Docker containers behind Caddy (auto-TLS via Let's Encrypt):

```
Internet → Caddy (:80/:443) → Frontend (Next.js :3000)
                              → Backend (FastAPI :8000)
         PostgreSQL (:5432), Redis (:6379), Worker (arq)
```

---

## Phase 1: Configure DNS (on get.tech registrar)

The domain `miror.tech` must point to the droplet IP before Caddy can issue an SSL certificate.

### Steps

1. Go to the .TECH domain dashboard at https://controlpanel.tech/
2. Find `miror.tech` and click **"Manage Orders"** → **"List/Search Orders"**
3. Click on `miror.tech` to open management
4. Find **"DNS Management"** or **"Nameserver Management"**
5. If there is a **DNS Management** panel (like a zone editor), add these records:

| Type  | Host/Name | Value             | TTL  |
|-------|-----------|-------------------|------|
| A     | @         | 157.230.215.4     | 600  |
| A     | www       | 157.230.215.4     | 600  |

6. If there is NO built-in DNS editor, switch nameservers to DigitalOcean's:
   - `ns1.digitalocean.com`
   - `ns2.digitalocean.com`
   - `ns3.digitalocean.com`
   - Then go to DigitalOcean dashboard → **Networking** → **Domains** → Add `miror.tech`
   - Add the same A records there (@ → 157.230.215.4, www → 157.230.215.4)

7. Verify DNS is propagating (may take 5–30 minutes):
   ```bash
   dig miror.tech +short
   # Should return: 157.230.215.4
   ```

> **IMPORTANT:** DNS must be resolving before Phase 4 (Caddy start), otherwise Let's Encrypt cert issuance will fail. If DNS hasn't propagated yet, start Caddy on `:80` first (without domain) and switch to the domain later.

---

## Phase 2: Prepare Local Code

There are uncommitted changes that are required for the production build. Commit them before deploying.

### Step 2.1: Verify uncommitted changes

These files are modified (bug fixes + Langfuse improvements):
- `backend/app/core/orchestrator.py` — Langfuse session context + scoring
- `backend/app/llm/client.py` — Langfuse tracing for extended thinking + context helpers
- `frontend/next.config.ts` — `output: "standalone"` (required for Docker build)
- `frontend/src/types/index.ts` — Added `error_message` to `StudyOut`, `total_cost_usd` to `StudySummary`

These files are new (deployment infrastructure):
- `Caddyfile` — Caddy reverse proxy config
- `docker-compose.prod.yml` — Production Docker Compose
- `frontend/Dockerfile` — Multi-stage Next.js build
- `frontend/.dockerignore` — Excludes node_modules/.next from Docker context

### Step 2.2: Commit everything

```bash
cd /Users/test/Downloads/mirror

git add \
  backend/app/core/orchestrator.py \
  backend/app/llm/client.py \
  frontend/next.config.ts \
  frontend/src/types/index.ts \
  Caddyfile \
  docker-compose.prod.yml \
  frontend/Dockerfile \
  frontend/.dockerignore

git commit -m "feat: add production deployment config and fix build type errors

- Add docker-compose.prod.yml with Caddy, backend, frontend, worker, postgres, redis
- Add Caddyfile with reverse proxy for API and frontend
- Add frontend Dockerfile (multi-stage Next.js standalone build)
- Add frontend .dockerignore
- Add output: standalone to next.config.ts (required for Docker)
- Fix TypeScript: add error_message to StudyOut, total_cost_usd to StudySummary
- Add Langfuse session context and study scoring to orchestrator
- Add Langfuse tracing for extended thinking calls in LLM client"

git push origin main
```

---

## Phase 3: Server Setup (SSH into Droplet)

### Step 3.1: Connect to the server

```bash
ssh root@157.230.215.4
```

### Step 3.2: Install Docker

```bash
curl -fsSL https://get.docker.com | sh
```

Verify:
```bash
docker --version
docker compose version
```

### Step 3.3: Create swap space (safety net for memory)

```bash
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

Verify:
```bash
free -h
# Should show: Mem: ~7.7Gi, Swap: 4.0Gi
```

### Step 3.4: Exit SSH (back to local machine)

```bash
exit
```

---

## Phase 4: Deploy Code to Server

### Step 4.1: Copy code to server via rsync

The repo is private, so we copy directly instead of cloning.

```bash
rsync -avz \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='__pycache__' \
  --exclude='.venv' \
  --exclude='data/' \
  --exclude='.git' \
  --exclude='.env' \
  /Users/test/Downloads/mirror/ \
  root@157.230.215.4:/opt/mirror/
```

### Step 4.2: Create the production `.env` file on the server

```bash
ssh root@157.230.215.4 "cat > /opt/mirror/.env << 'EOF'
# --- Domain ---
SITE_ADDRESS=miror.tech

# --- Database ---
POSTGRES_PASSWORD=your-secure-password

# --- API Keys ---
ANTHROPIC_API_KEY=sk-ant-...
BROWSERBASE_API_KEY=bb_live_...
BROWSERBASE_PROJECT_ID=your-project-id
FIRECRAWL_API_KEY=fc-...

# --- Langfuse ---
LANGFUSE_HOST=https://cloud.langfuse.com
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...

# --- App Config ---
LOG_LEVEL=INFO
EOF"
```

### Step 4.3: Update Caddyfile for the domain with HTTPS

The Caddyfile uses the `SITE_ADDRESS` env var from `.env`. It's already configured:

```
{$SITE_ADDRESS:80} {
    handle /api/v1/* {
        reverse_proxy backend:8000
    }
    handle {
        reverse_proxy frontend:3000
    }
}
```

When `SITE_ADDRESS=miror.tech`, Caddy will:
- Automatically get a Let's Encrypt SSL certificate
- Serve on HTTPS (port 443)
- Redirect HTTP → HTTPS

> **If DNS is NOT yet propagated:** Temporarily override by setting `SITE_ADDRESS=:80` in the `.env` file. This serves on HTTP without a domain. Switch back to `SITE_ADDRESS=miror.tech` once DNS resolves, then restart Caddy: `docker compose -f docker-compose.prod.yml restart caddy`

---

## Phase 5: Build and Start All Containers

### Step 5.1: Build and deploy

```bash
ssh root@157.230.215.4 "cd /opt/mirror && docker compose -f docker-compose.prod.yml up -d --build"
```

This builds 3 images and starts 6 containers:
- `postgres` — PostgreSQL 16
- `redis` — Redis 7
- `backend` — FastAPI (uvicorn)
- `worker` — arq background worker
- `frontend` — Next.js standalone
- `caddy` — Reverse proxy + auto-TLS

**Expected time:** ~3-5 minutes for first build.

### Step 5.2: Verify all containers are running

```bash
ssh root@157.230.215.4 "cd /opt/mirror && docker compose -f docker-compose.prod.yml ps"
```

All 6 containers should show `Up` status. Postgres and Redis should show `(healthy)`.

---

## Phase 6: Database Setup

### Step 6.1: Run migrations

```bash
ssh root@157.230.215.4 "cd /opt/mirror && docker compose -f docker-compose.prod.yml exec backend bash -c 'cd /app && PYTHONPATH=/app alembic upgrade head'"
```

> **IMPORTANT:** The `PYTHONPATH=/app` is required because the Dockerfile installs the package in editable mode but alembic needs the app module on the path.

Expected output:
```
INFO  [alembic.runtime.migration] Running upgrade  -> 001_initial, ...
INFO  [alembic.runtime.migration] Running upgrade 001_initial -> 002, ...
INFO  [alembic.runtime.migration] Running upgrade 002 -> 003, ...
INFO  [alembic.runtime.migration] Running upgrade 003 -> 004, ...
```

### Step 6.2: Seed persona templates (optional but recommended)

```bash
ssh root@157.230.215.4 "cd /opt/mirror && docker compose -f docker-compose.prod.yml exec backend python -c 'from app.services.persona_service import PersonaService; print(\"Persona service OK\")'"
```

If there is a seed script:
```bash
ssh root@157.230.215.4 "cd /opt/mirror && docker compose -f docker-compose.prod.yml exec backend python -m app.data.seed"
```

---

## Phase 7: Verification

### Step 7.1: Check API health

```bash
ssh root@157.230.215.4 "curl -s http://localhost/api/v1/health"
```

Should return JSON with status info.

### Step 7.2: Check frontend

```bash
curl -s -o /dev/null -w '%{http_code}' https://miror.tech
```

Should return `200`.

### Step 7.3: Open in browser

Visit: **https://miror.tech**

The full Mirror app should load with the dashboard/landing page.

---

## Phase 8: WebSocket Configuration (if needed)

The Caddyfile already proxies `/api/v1/*` which includes WebSocket upgrade requests. Caddy handles WebSocket proxying natively — no extra config needed.

If WebSocket connections fail, add explicit WebSocket handling to the Caddyfile:

```
{$SITE_ADDRESS:80} {
    handle /api/v1/ws/* {
        reverse_proxy backend:8000
    }
    handle /api/v1/* {
        reverse_proxy backend:8000
    }
    handle {
        reverse_proxy frontend:3000
    }
}
```

Then restart Caddy:
```bash
ssh root@157.230.215.4 "cd /opt/mirror && docker compose -f docker-compose.prod.yml restart caddy"
```

---

## Troubleshooting

### Container logs
```bash
# All logs
ssh root@157.230.215.4 "cd /opt/mirror && docker compose -f docker-compose.prod.yml logs --tail 50"

# Specific service
ssh root@157.230.215.4 "cd /opt/mirror && docker compose -f docker-compose.prod.yml logs backend --tail 50"
ssh root@157.230.215.4 "cd /opt/mirror && docker compose -f docker-compose.prod.yml logs frontend --tail 50"
ssh root@157.230.215.4 "cd /opt/mirror && docker compose -f docker-compose.prod.yml logs caddy --tail 50"
ssh root@157.230.215.4 "cd /opt/mirror && docker compose -f docker-compose.prod.yml logs worker --tail 50"
```

### SSL cert not issued
If Caddy can't get a cert (DNS not ready), check:
```bash
ssh root@157.230.215.4 "cd /opt/mirror && docker compose -f docker-compose.prod.yml logs caddy --tail 20"
```
Fix: temporarily set `SITE_ADDRESS=:80` in `.env`, restart caddy, wait for DNS, then switch back.

### Frontend build fails
If the frontend Docker build fails with TypeScript errors:
```bash
# Check types locally first
cd /Users/test/Downloads/mirror/frontend && npx tsc --noEmit
```
Fix locally, rsync again, and rebuild.

### Alembic "No module named 'app'" error
Always run alembic with PYTHONPATH:
```bash
docker compose -f docker-compose.prod.yml exec backend bash -c 'cd /app && PYTHONPATH=/app alembic upgrade head'
```

### Out of memory
Check memory usage:
```bash
ssh root@157.230.215.4 "free -h && docker stats --no-stream"
```
With 8GB RAM + 4GB swap, this should not be an issue.

### Redeploy after code changes
```bash
# From local machine
rsync -avz \
  --exclude='node_modules' --exclude='.next' --exclude='__pycache__' \
  --exclude='.venv' --exclude='data/' --exclude='.git' --exclude='.env' \
  /Users/test/Downloads/mirror/ root@157.230.215.4:/opt/mirror/

# Rebuild and restart
ssh root@157.230.215.4 "cd /opt/mirror && docker compose -f docker-compose.prod.yml up -d --build"

# Run new migrations if any
ssh root@157.230.215.4 "cd /opt/mirror && docker compose -f docker-compose.prod.yml exec backend bash -c 'cd /app && PYTHONPATH=/app alembic upgrade head'"
```

---

## Quick Reference

| Item | Value |
|------|-------|
| Domain | `miror.tech` |
| Droplet IP | `157.230.215.4` |
| SSH command | `ssh root@157.230.215.4` |
| SSH key | `~/.ssh/id_ed25519` |
| Code on server | `/opt/mirror/` |
| Env file on server | `/opt/mirror/.env` |
| Compose file | `docker-compose.prod.yml` |
| Start all | `docker compose -f docker-compose.prod.yml up -d --build` |
| Stop all | `docker compose -f docker-compose.prod.yml down` |
| View logs | `docker compose -f docker-compose.prod.yml logs -f` |
| Run migrations | `docker compose -f docker-compose.prod.yml exec backend bash -c 'cd /app && PYTHONPATH=/app alembic upgrade head'` |
| Domain registrar | https://controlpanel.tech/ |
| DigitalOcean dashboard | https://cloud.digitalocean.com/ |
