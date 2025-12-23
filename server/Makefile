# =========================================================
# NCKH Project - Makefile
# =========================================================
# Single source of truth: .env at root
# All services read from docker-compose.yml
# =========================================================

.PHONY: help dev prod down logs clean migrate build

# Default target
help:
	@echo "=============================================="
	@echo "NCKH Project Commands"
	@echo "=============================================="
	@echo ""
	@echo "Docker Commands:"
	@echo "  make infra       - Start infrastructure only (DB, Redis, RabbitMQ)"
	@echo "  make dev         - Start all services + Adminer (dev mode)"
	@echo "  make prod        - Start all services (production mode)"
	@echo "  make down        - Stop all services"
	@echo "  make logs        - View all logs"
	@echo "  make clean       - Remove containers, volumes, images"
	@echo "  make build       - Rebuild all Docker images"
	@echo ""
	@echo "Local Dev (without Docker for app services):"
	@echo "  make local-gateway  - Run Gateway locally"
	@echo "  make local-worker   - Run Worker locally"
	@echo ""
	@echo "Database:"
	@echo "  make migrate        - Run DB migrations (Gateway/Drizzle)"
	@echo "  make migrate-gen    - Generate migration files"
	@echo "  make sync-schema    - Sync schema Gateway -> Worker"
	@echo ""

# =========================================================
# DOCKER COMMANDS
# =========================================================

# Start infrastructure only (for local development)
infra:
	@echo "Starting infrastructure..."
	docker compose up -d postgres redis rabbitmq
	@echo ""
	@echo "✅ Infrastructure started!"
	@echo "   PostgreSQL: localhost:$(shell grep POSTGRES_PORT .env | cut -d '=' -f2)"
	@echo "   Redis:      localhost:$(shell grep REDIS_PORT .env | cut -d '=' -f2)"
	@echo "   RabbitMQ:   localhost:$(shell grep RABBITMQ_PORT .env | cut -d '=' -f2)"
	@echo "   RabbitMQ UI: localhost:$(shell grep RABBITMQ_MANAGEMENT_PORT .env | cut -d '=' -f2)"

# Start all services in dev mode (with adminer)
dev:
	docker compose --profile dev up -d
	@echo ""
	@echo "✅ All services started in DEVELOPMENT mode!"
	@echo "   Gateway:  http://localhost:$(shell grep GATEWAY_PORT .env | cut -d '=' -f2)"
	@echo "   Worker:   localhost:$(shell grep WORKER_GRPC_PORT .env | cut -d '=' -f2)"
	@echo "   Adminer:  http://localhost:$(shell grep ADMINER_PORT .env | cut -d '=' -f2)"

# Start all services in production mode
prod:
	docker compose up -d postgres redis rabbitmq gateway worker
	@echo "✅ All services started in PRODUCTION mode!"

# Build all images
build:
	docker compose build --no-cache

# Rebuild specific service
rebuild-gateway:
	docker compose build --no-cache gateway
	docker compose up -d gateway

rebuild-worker:
	docker compose build --no-cache worker
	docker compose up -d worker

# =========================================================
# OPERATIONS
# =========================================================

# Stop all services
down:
	docker compose --profile dev down

# View logs
logs:
	docker compose logs -f

logs-gateway:
	docker compose logs -f gateway

logs-worker:
	docker compose logs -f worker

# Clean everything
clean:
	docker compose --profile dev down -v --rmi local
	@echo "✅ All containers, volumes, and local images removed!"

# Restart services
restart:
	docker compose restart

restart-gateway:
	docker compose restart gateway

restart-worker:
	docker compose restart worker

# =========================================================
# LOCAL DEVELOPMENT (App services outside Docker)
# =========================================================

# Setup local env for Gateway
setup-local-gateway:
	@echo "Creating .env.local for Gateway..."
	@if not exist gateway\.env.local copy gateway\.env.local.example gateway\.env.local
	@echo "✅ Edit gateway/.env.local if needed"

# Run Gateway locally (requires: make infra first)
local-gateway:
	cd gateway && pnpm start:dev

# Run Worker locally (requires: make infra first)  
local-worker:
	cd worker && go run cmd/main.go

# =========================================================
# DATABASE
# =========================================================

# Run migrations (from Gateway - Drizzle)
migrate:
	cd gateway && pnpm drizzle-kit push

# Generate migration files
migrate-gen:
	cd gateway && pnpm drizzle-kit generate

# Sync schema from Gateway to Worker, then regenerate SQLC
sync-schema:
	@echo "Syncing schema from Gateway to Worker..."
	@type gateway\drizzle\*.sql > worker\internal\adapter\storage\postgres\db\schema.sql 2>nul || echo "No SQL files found"
	cd worker && sqlc generate
	@echo "✅ Schema synced and SQLC regenerated!"

# Just regenerate SQLC (Worker)
sqlc:
	cd worker && sqlc generate

# =========================================================
# PROTO (gRPC)
# =========================================================

proto:
	@echo "Generating proto files..."
	@if exist proto cd proto && ./generate.sh
