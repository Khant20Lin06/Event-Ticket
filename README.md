# AURA — Enterprise High-Concurrency Event Ticketing Platform

An enterprise-grade, distributed event ticketing and seat reservation platform built to withstand extreme high-concurrency traffic (1,000,000+ concurrent requests) without double-booking or over-selling.

---

## 🏛️ Monorepo Architecture

```
event-ticket-concurrency-api/
├── event-ticket/         # Backend: NestJS, TypeORM, Redis Locking, BullMQ, WebSocket Gateway
│   ├── src/              # Modules (Auth, Bookings, Events, Seats, Queues, Redis, AI)
│   ├── k8s/              # Kubernetes Deployment, Service, HPA, and Ingress manifests
│   ├── Dockerfile        # Production multi-stage Docker build
│   └── nginx.conf        # Internal API load balancer configuration
│
├── event-ticket-web/     # Frontend: Angular 19 (Signals, Standalone Components, Glassmorphism UI)
│   ├── src/app/          # Core models/services & Feature components (Seat Map, Organizer Console)
│   └── public/           # AURA Brand assets and icons
│
├── docker-compose.yml    # Full-stack local orchestration (Postgres, PgBouncer, Redis, Multi-replica API, Nginx)
└── package.json          # Root workspace automation scripts
```

---

## 🚀 Key Features

- **Distributed Atomic Locking**: Uses Redis (`SET NX PX` / Redlock pattern) ensuring that only one user can hold a specific seat at any given millisecond.
- **Queueing & Auto-Release**: Integrated **BullMQ** background worker queues to automatically release held seats after expiration timeouts (5-10 minutes).
- **PgBouncer Connection Pooling**: Transaction-mode connection pooler sitting in front of PostgreSQL, enabling horizontal scaling of API nodes without exhausting database connections.
- **Real-Time Interactive Seat Matrix**: High-performance interactive cinema seating controller with live WebSocket status sync and SVG seat matrix.
- **Enterprise Operator Console**: Comprehensive management portal for creating screenings, setting pricing tiers, throttling admission velocity, and managing live inventory.
- **OWASP Hardened**: Protected with Helmet headers, throttled rate limiting, strict CORS, and whitelisted class-validator pipes.

---

## 🛠️ Tech Stack

### Backend
- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL with TypeORM
- **Connection Pooler**: PgBouncer
- **Caching & Locks**: Redis (ioredis)
- **Queues**: BullMQ
- **Real-time**: Socket.IO / WebSockets
- **Containerization & Orchestration**: Docker, Docker Compose, Kubernetes

### Frontend
- **Framework**: Angular 19 (Standalone, Signals, Reactive State)
- **Styling**: Cyberpunk Cinema Glassmorphism UI (Vanilla CSS + Design Tokens)
- **Icons & Assets**: Custom SVG Vector Badges and Cinema Brand Icons

---

## 🚦 Quick Start

### 1. Run the Entire Infrastructure with Docker
```bash
docker compose up -d --build
```
This automatically starts:
- PostgreSQL on `5433`
- PgBouncer on `6432`
- Redis on `6380`
- Scaled NestJS API instances behind Nginx Load Balancer on `3000`

### 2. Run Local Development Mode

#### Backend:
```bash
cd event-ticket
npm install
npm run start:dev
```

#### Frontend:
```bash
cd event-ticket-web
npm install
npm run start
```
Frontend runs at `http://localhost:4200`
Backend API runs at `http://localhost:3000/api/v1`

---

## 💥 Concurrency Stress Testing

Simulate high-concurrency contention against a single seat:
```bash
npm run test:concurrency
```

---

## 📝 License
This project is UNLICENSED.
