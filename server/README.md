# NCKH Project - Server

Hệ thống microservices cho đồ án NCKH.

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Client      │────▶│     Gateway     │────▶│     Worker      │
│   (Frontend)    │     │    (NestJS)     │     │      (Go)       │
└─────────────────┘     └────────┬────────┘     └────────┬────────┘
                                 │                       │
                    ┌────────────┼────────────┐          │
                    ▼            ▼            ▼          ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
              │ Postgres │ │  Redis   │ │ RabbitMQ │ │ Postgres │
              └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

## 📁 Project Structure

```
server/
├── docker-compose.yml    # Orchestration tất cả services
├── .env.example          # Template biến môi trường  
├── Makefile              # Commands tắt
├── gateway/              # NestJS API Gateway
│   ├── src/
│   ├── drizzle/          # Schema & Migrations (SOURCE OF TRUTH)
│   └── Dockerfile
└── worker/               # Go Worker (gRPC)
    ├── cmd/
    ├── internal/
    ├── pb/               # Generated proto
    └── Dockerfile
```

## 🚀 Quick Start

### 1. Setup Environment

```bash
# Copy env file
cp .env.example .env

# Edit .env với credentials thực tế
```

### 2. Start Services

```bash
# Chỉ infrastructure (dev local)
make infra

# Tất cả services + Adminer (dev)
make dev

# Production mode
make prod
```

### 3. Run Migrations

```bash
# Gateway quản lý schema
make migrate
```

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `make dev` | Start tất cả services (dev mode) |
| `make prod` | Start tất cả services (prod mode) |
| `make infra` | Chỉ start Postgres, Redis, RabbitMQ |
| `make down` | Stop tất cả services |
| `make logs` | Xem logs tất cả services |
| `make clean` | Xóa containers, volumes, images |
| `make migrate` | Chạy DB migrations |
| `make sqlc` | Regenerate SQLC code (Worker) |

## 🔧 Development Workflow

### Schema Changes

1. **Edit schema** trong `gateway/src/drizzle/schema.ts`
2. **Generate migration**: `make migrate-gen`
3. **Apply migration**: `make migrate`
4. **Sync Worker**: `make sqlc`

### Local Development (Không Docker)

```bash
# Terminal 1: Infrastructure
make infra

# Terminal 2: Gateway
make gateway-dev

# Terminal 3: Worker
make worker-dev
```

## 🔐 Important: Schema Source of Truth

> ⚠️ **Gateway (Drizzle) là nguồn duy nhất quản lý schema.**
> 
> Worker chỉ có `query.sql` để generate code, KHÔNG có schema riêng.

## 📡 Service Ports

| Service | Port | Description |
|---------|------|-------------|
| Gateway | 3000 | HTTP API |
| Worker | 50051 | gRPC |
| Postgres | 5433 | Database |
| Redis | 6379 | Cache |
| RabbitMQ | 5672 | Message Queue |
| RabbitMQ UI | 15672 | Management |
| Adminer | 8081 | DB GUI (dev only) |
