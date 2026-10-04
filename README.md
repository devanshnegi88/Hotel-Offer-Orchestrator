# 🏨 Hotel Offer Orchestrator

<img width="2048" height="768" alt="Image" src="https://github.com/user-attachments/assets/b6be3821-6c52-465e-ac68-9925aa47b2fb" />
  <strong>A resilient, production-ready, Temporal-orchestrated hotel offer aggregation service with Redis-native price filtering</strong>
</p><p align="center">
    <img src="https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/TypeScript-5+-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Temporal-Workflow-000000?style=for-the-badge" alt="Temporal">
  <img src="https://img.shields.io/badge/Redis-Sorted%20Sets-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis">
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker">
  <img src="https://img.shields.io/badge/Security-Helmet%20%2B%20Rate%20Limit-green?style=for-the-badge" alt="Security">
</p><p align="center">
  <img src="https://img.shields.io/badge/Tests-61%20passing-2EA44F?style=flat-square" alt="Tests">
  <img src="https://img.shields.io/badge/Suppliers-2-6F42C1?style=flat-square" alt="Suppliers">
  <img src="https://img.shields.io/badge/Filtering-ZRANGEBYSCORE-0969DA?style=flat-square" alt="Redis Filtering">
  <img src="https://img.shields.io/badge/Orchestration-Temporal-F39C12?style=flat-square" alt="Temporal">
</p>

---

## 🎯 Overview

Hotel Offer Orchestrator is a backend service that aggregates hotel offers from multiple suppliers, deduplicates them, persists the cheapest offers to Redis, and exposes them through a REST API.

The system uses Temporal for workflow orchestration, retries, parallel supplier execution, batch processing, and Redis persistence.

Given a city, the service:

1. ⚡ Fetches Supplier A and Supplier B in parallel.
2. 📦 Processes both responses as an aggregation batch.
3. 🧹 Deduplicates hotels using normalized names.
4. 💰 Keeps the cheapest offer for duplicate hotels.
5. 🔴 Persists results using Redis Sorted Sets + Hashes.
6. 🔎 Performs price filtering directly inside Redis using `ZRANGEBYSCORE`.
7. 🛡️ Handles individual supplier failures gracefully.
8. 🔐 Enforces enterprise production standards (Helmet security headers, CORS, rate limiting, liveness/readiness probes, structured JSON logging, non-root Docker security).
9. 📤 Returns the final offers through a REST API.

---

## 🏗️ Architecture

<img width="1536" height="1024" alt="Image" src="https://github.com/user-attachments/assets/66a96522-ee82-4212-b013-e822362de1ab" />

---

## 🔄 Processing Pipeline

<img width="1218" height="1291" alt="Image" src="https://github.com/user-attachments/assets/a25c55e5-b543-45bf-a268-2049cd8ce61a" />

---

## ✨ Key Features & Production Readiness

| Feature | Implementation |
|---|---|
| ⚡ Parallel fetching | Temporal activities |
| 📦 Batch processing | Per-city aggregation batch |
| 🧹 Deduplication | Normalized hotel names |
| 💰 Cheapest offer | Deterministic merge logic |
| 🔴 Persistence | Redis Sorted Sets + Hashes |
| 🔎 Price filtering | Native `ZRANGEBYSCORE` |
| 🔁 Retries | Temporal exponential backoff |
| 🛡️ Fault tolerance | Supplier-level degradation |
| 🆔 Request tracing | `X-Request-Id` |
| 🔒 Security Hardening | Helmet (HSTS, CSP, No-Sniff), CORS, `x-powered-by` disabled |
| 🚦 Rate Limiting | Configurable IP rate limiting (`express-rate-limit`) |
| 📊 Observability | Structured JSON logging (`LOG_FORMAT=json`), Liveness & Readiness health probes |
| 💀 Process Safety | Uncaught exception & unhandled rejection handlers with graceful shutdown timeouts |
| 🐳 Secure Docker | Non-root `node` container user & healthcheck probes |
| 📜 OpenAPI 3.0 | Complete API specification in `openapi.yaml` |
| ⚙️ CI/CD | GitHub Actions workflow (`.github/workflows/ci.yml`) |
| 🧪 Testing | Jest + Postman/Newman |

---

## 🔒 Production Security & Hardening

1. **Security Headers (Helmet)**: Enforces HTTP security headers including Content-Security-Policy, HTTP Strict Transport Security (HSTS), X-Frame-Options, and X-Content-Type-Options.
2. **CORS Control**: Configurable cross-origin resource sharing via `CORS_ORIGIN`.
3. **Rate Limiting**: Protects endpoints against DDoS attacks and brute-force queries (configurable via `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX`).
4. **Input Sanitization**: Rejects excessively long query inputs (e.g. `city` max 100 chars) and validates all numeric bounds.
5. **Non-Root Docker Execution**: Dockerfile switches to unprivileged `USER node` for security compliance.

---

## 📊 Observability & Health Probes

### Log Formatting
Supports both structured JSON logging (`LOG_FORMAT=json`) for production cloud aggregators (Datadog, AWS CloudWatch, GCP Logging) and human-readable text logs (`LOG_FORMAT=text`) for local development.

### Kubernetes / Container Health Probes
- **Readiness Probe (`GET /health` or `GET /health/ready`)**: Deep health check verifying connectivity to Redis, Supplier A, Supplier B, and Temporal.
- **Liveness Probe (`GET /health/live`)**: Fast probe returning HTTP 200 to verify the process is alive.

---

## 🧹 Deduplication Rules

Hotels are matched using a case-insensitive, trimmed name.

- Same hotel → cheapest price wins.
- Hotel in one supplier → retained.
- Equal price → Supplier A wins.
- Case differences → ignored.
- Leading/trailing whitespace → ignored.
- Duplicate records within a supplier → collapsed.

---

## ⚙️ Temporal Workflow
```
"getHotelOffersWorkflow(city)" performs:

1. ⚡ Fetch Supplier A + B concurrently
2. 🔁 Retry failed activities
3. 🛡️ Degrade failed supplier to []
4. 🧹 Merge and deduplicate offers
5. 💾 Persist aggregation batch to Redis
6. 📤 Return final offers
```

---

## 🔴 Redis Data Model & Filtering

### Sorted Set (`hotels:{city}:index`)
- **Score**: Price
- **Member**: Hotel name

### Hash (`hotel:{city}:{slug(name)}`)
Stores complete hotel JSON object fields (`name`, `price`, `supplier`, `commissionPct`).

Price range query executed natively in Redis:
```bash
ZRANGEBYSCORE hotels:delhi:index 3000 6000
```

---

## 🌐 API Specification

- `GET /health` — Service readiness check & dependency status
- `GET /health/live` — Fast process liveness check
- `GET /supplierA/hotels?city=delhi` — Mock Supplier A
- `GET /supplierB/hotels?city=delhi` — Mock Supplier B
- `GET /api/hotels?city=delhi&minPrice=3000&maxPrice=6000` — Aggregated & filtered hotel offers

---

## 🚀 Local Setup & Docker Deployment

### Local Development
```bash
npm install
cp .env.example .env
npm run dev
npm run worker
```

### Docker Compose
```bash
docker compose build
docker compose up
```

---

## 🧪 Testing
```bash
npm test
npm run typecheck
```

- **Unit & Integration Tests**: 61 passed
- **OpenAPI 3.0 Specification**: `openapi.yaml`
- **Postman Collection**: `postman/Hotel-Offer-Orchestrator.postman_collection.json`
