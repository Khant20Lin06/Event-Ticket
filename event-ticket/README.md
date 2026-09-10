# Event Ticket Concurrency API

A high-performance Event Ticket Booking API built with **NestJS**, **PostgreSQL**, and **Redis** to demonstrate handling extreme high-concurrency seat booking scenarios without double-booking.

## 🚀 Key Features

- **Distributed Atomic Locking**: Uses Redis (`SET NX PX`) to guarantee that only one user can hold a specific seat at any given time.
- **High Concurrency Handling**: Prevents double-booking (over-selling) even when thousands of users try to book the exact same seat at the exact same millisecond.
- **Background Queueing**: Uses **BullMQ** to automatically release held seats if a user doesn't complete the checkout within 5 minutes.
- **OWASP Security Standards**: Hardened with Helmet (HTTP headers), strict CORS policies, Global Validation Pipes, and Rate Limiting (60 requests/min).
- **Stress Tested**: Includes a custom `autocannon` test script to simulate 1 Million concurrent requests.

## 🛠️ Tech Stack

- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL (TypeORM)
- **Cache & Locks**: Redis, ioredis
- **Message Queue**: BullMQ
- **Security**: Helmet, @nestjs/throttler, JWT Authentication

## 🛡️ Security & OWASP Standards

This API is protected using OWASP best practices:
- **Rate Limiting**: `@nestjs/throttler` prevents Brute-Force and DDoS attacks (Max 60 requests per minute per IP).
- **Helmet**: Sets 15+ secure HTTP headers to prevent XSS, Clickjacking, and MIME-sniffing.
- **Strict CORS**: Cross-Origin Resource Sharing is locked down to specific HTTP methods.
- **Data Sanitization**: `@nestjs/common`'s ValidationPipe is configured with `whitelist: true` and `forbidNonWhitelisted: true` to prevent Mass Assignment and Injection.

## 🚦 Getting Started

### 1. Prerequisites
- Docker and Docker Compose
- Node.js (v18+)
- npm or yarn

### 2. Run Infrastructure (Postgres & Redis)
```bash
docker-compose up -d
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Setup Environment Variables
Create a `.env` file in the root directory:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5433
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=event_ticket_db
REDIS_HOST=localhost
REDIS_PORT=6380
JWT_SECRET=super_secret_jwt_key
ALLOWED_ORIGINS=http://localhost:3000
```

### 5. Start the Application
```bash
# Start in development mode (This will also seed dummy users and events)
npm run start:dev
```

## 💥 Running the Concurrency Stress Test

To see the distributed locking in action and verify that double-booking is impossible:

1. Ensure the server is running (`npm run start:dev`).
2. Open a new terminal window.
3. Run the 1M requests concurrency test:
```bash
npm run test:1m
```
*Note: This uses `autocannon` to fire 1,000,000 requests for the exact same seat. The script will output exactly **1 success** and **999,999 conflicts**, proving that double-booking is completely prevented.*

## 📈 Horizontal Scaling

### Local (Docker Compose)
The `api` service has no fixed container name or published port, so it can be scaled to
multiple replicas behind the bundled nginx load balancer:
```bash
docker-compose up -d --scale api=10
```
nginx re-resolves the `api` hostname on every request against Docker's embedded DNS
(`127.0.0.11`), so it round-robins across all currently-running replicas — no reload needed
when you scale up or down.

All replicas share the same PgBouncer (`transaction` pool mode, `DEFAULT_POOL_SIZE=100`) in
front of Postgres, and the same Redis instance for locking/cache/queues, so scaling `api`
horizontally doesn't multiply raw Postgres connections — each replica keeps its own pool small
(`DB_POOL_SIZE`, default 10) and PgBouncer multiplexes those down to the real Postgres pool.

### Kubernetes
`k8s/deployment.yaml` + `k8s/hpa.yaml` scale the API from 50 to 500 pods based on CPU/memory
utilization:
```bash
kubectl apply -f k8s/deployment.yaml -f k8s/service.yaml -f k8s/hpa.yaml -f k8s/ingress.yaml
```
Point `DB_HOST` at your PgBouncer instance/service and `REDIS_HOST` at your Redis
instance/cluster before deploying.

## 📚 API Documentation
For detailed API endpoints, please refer to the `api-guide.md` file included in this repository.

## 📝 License
This project is UNLICENSED.
