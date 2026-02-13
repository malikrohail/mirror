.PHONY: dev dev-all test lint migrate worker dev-worker docker-up docker-down

# Development — start everything (Docker + backend + frontend)
dev-all:
	./scripts/dev.sh

# Development — backend only
dev:
	cd backend && uvicorn app.main:app --reload --port 8000

worker:
	cd backend && arq app.workers.settings.WorkerSettings

dev-worker:
	cd backend && python scripts/dev_worker.py

# Database
migrate:
	cd backend && alembic upgrade head

migrate-create:
	cd backend && alembic revision --autogenerate -m "$(msg)"

# Testing
test:
	cd backend && python -m pytest tests/ -v

test-cov:
	cd backend && python -m pytest tests/ -v --cov=app --cov-report=html

# Linting
lint:
	cd backend && ruff check app/ tests/
	cd backend && ruff format --check app/ tests/

format:
	cd backend && ruff check --fix app/ tests/
	cd backend && ruff format app/ tests/

# Docker
docker-up:
	docker compose up -d postgres redis

docker-down:
	docker compose down

docker-all:
	docker compose up --build

# Docker local mode (Iteration 5)
docker-local:
	docker compose --profile local up --build

docker-local-worker:
	docker compose --profile local up --build worker-local

# Setup
install:
	cd backend && pip install -e ".[dev]"
	cd backend && playwright install chromium

install-local:
	cd backend && pip install -e ".[dev]"
	cd backend && pip install psutil
	cd backend && playwright install chromium

seed:
	cd backend && python -m app.data.seed

# Browser pool health check (Iteration 5)
health-browser:
	curl -s http://localhost:8000/api/v1/health/browser | python -m json.tool
