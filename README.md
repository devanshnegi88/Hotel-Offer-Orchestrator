# 🏨 Hotel Offer Orchestrator

<img width="2048" height="768" alt="Image" src="https://github.com/user-attachments/assets/b6be3821-6c52-465e-ac68-9925aa47b2fb" />
  <strong>A resilient, Temporal-orchestrated hotel offer aggregation service with Redis-native price filtering</strong>
</p><p align="center">
    <img src="https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/TypeScript-5+-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Temporal-Workflow-000000?style=for-the-badge" alt="Temporal">
  <img src="https://img.shields.io/badge/Redis-Sorted%20Sets-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis">
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker">
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

3. 📦 Processes both responses as an aggregation batch.
   
5. 🧹 Deduplicates hotels using normalized names.
  
7. 💰 Keeps the cheapest offer for duplicate hotels.
   
9. 🔴 Persists results using Redis Sorted Sets + Hashes.
    
11. 🔎 Performs price filtering directly inside Redis using "ZRANGEBYSCORE".
    
13. 🛡️ Handles individual supplier failures gracefully.
    
15. 📤 Returns the final offers through a REST API.

### Core principle: 
Temporal handles orchestration and reliability, Redis handles indexed price filtering, and business logic remains isolated from infrastructure.»

---

## 🏗️ Architecture

<img width="1536" height="1024" alt="Image" src="https://github.com/user-attachments/assets/66a96522-ee82-4212-b013-e822362de1ab" />
>
---

## 🔄 Processing Pipeline

<img width="1218" height="1291" alt="Image" src="https://github.com/user-attachments/assets/a25c55e5-b543-45bf-a268-2049cd8ce61a" />

---

## ✨ Key Features

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
| 🐳 Deployment | Docker Compose |
| 🧪 Testing | Jest + Postman/Newman |

---

## 🧹 Deduplication

Hotels are matched using a case-insensitive, trimmed name.

```
Supplier A
───────────
Holtin      ₹6000
Radison     ₹5900

Supplier B
───────────
Holtin      ₹5340
Radison     ₹6150

              ↓

Final Batch
───────────
Holtin      ₹5340  → Supplier B
Radison     ₹5900  → Supplier A
```

### Rules

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

## 🔁 Retry Policy
```
Timeout:          10s
Initial delay:     1s
Backoff factor:    2x
Maximum delay:    10s
Maximum attempts:  3
```
If one supplier fails after all retries, the workflow continues using the available supplier's offers.

---

## 🔴 Redis Data Model

Sorted Set
```
hotels:{city}:index
```
Score  → Price
Member → Hotel name

Example:

2950 → Clarks Inn
3400 → Lemon Tree
5340 → Holtin
5900 → Radison
8200 → Taj Continental
9400 → Hyatt Place

Hash
```
hotel:{city}:{slug(name)}
```
Stores the complete hotel record:
```
{
  "name": "Holtin",
  "price": 5340,
  "supplier": "Supplier B",
  "commissionPct": 20
}
```
The city dataset is fully replaced on every successful aggregation, preventing stale offers from remaining in Redis.

---

## 🔎 Redis-Native Filtering

Price filtering is performed directly by Redis:

ZRANGEBYSCORE hotels:delhi:index 3000 6000
```
GET /api/hotels
       │
       ▼
Redis ZRANGEBYSCORE
       │
       ▼
Matching hotel names
       │
       ▼
Pipeline HGETALL
       │
       ▼
Complete hotel objects
```
The application does not load the complete hotel dataset and filter it using JavaScript.

---

### 🌐 API

### ❤️ Health

```GET /health```

## 🏨 Mock Suppliers
```
GET /supplierA/hotels?city=delhi
GET /supplierB/hotels?city=delhi
```

## 🔎 Hotel Offers

```GET /api/hotels?city=delhi```

Price filtering:
````
GET /api/hotels?city=delhi&minPrice=3000&maxPrice=6000
````
Response Codes

| Status | Scenario |
|---|---|
| `200` | Successful request |
| `400` | Invalid query parameters |
| `502` | Workflow/aggregation failure |
| `503` | Redis read failure |
| `404` | Unknown route |

Every response includes an "X-Request-Id" for request tracing.

---

🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Language | TypeScript |
| API | Express |
| Workflow | Temporal |
| Database | Redis |
| Temporal Persistence | PostgreSQL |
| Testing | Jest |
| API Testing | Postman + Newman |
| Deployment | Docker + Docker Compose |

---

## 🚀 Local Setup

### Requirements

- Node.js 20+
- Redis
- Temporal CLI
- npm

### Install
```
npm install
cp .env.example .env
```
Start Services

#### Terminal 1
```redis-server```

#### Terminal 2
```temporal server start-dev```

#### Terminal 3
```npm run dev```

#### Terminal 4
```npm run worker```

### Test:

```curl "http://localhost:3000/api/hotels?city=delhi"```

---

## 🐳 Docker Setup

Build and start the complete stack:

```
docker compose build
docker compose up
```

#### Services:
```
PostgreSQL
     ↓
Temporal
     ↓
Redis
     ↓
API + Worker
```
#### Docker service communication:
```
API       → api:3000
Redis     → redis:6379
Temporal  → temporal:7233
```

---

## 🧪 Testing

##### Run:

```npm test```

#### Coverage

🧹 Aggregation & deduplication
🔎 Query validation
🔁 Retry/backoff
🛡️ Error handling
🔴 Redis persistence
🏨 Supplier endpoints
❤️ Health endpoint
🌐 Hotels API

#### Results

8 suites
61 tests
0 failures

---

## 📮 Postman

Import:

```
postman/
└── Hotel-Offer-Orchestrator.postman_collection.json

Or run with Newman:

npm install -g newman

newman run \
  postman/Hotel-Offer-Orchestrator.postman_collection.json
```
Collection

- ❤️ Health
- 🏨 Supplier A
- 🏨 Supplier B
- 🔎 Hotels API
- 💰 Price filtering
- ❌ Validation errors
- 🛡️ Resilience scenario

Latest Run

13 requests
13 test scripts
24 assertions
0 failures

---

#### 📊 Example

Request
```
GET /api/hotels?city=delhi&minPrice=3000&maxPrice=6000
```
Response
```
[
  {
    "name": "Lemon Tree",
    "price": 3400,
    "supplier": "Supplier A",
    "commissionPct": 8
  },
  {
    "name": "Holtin",
    "price": 5340,
    "supplier": "Supplier B",
    "commissionPct": 20
  },
  {
    "name": "Radison",
    "price": 5900,
    "supplier": "Supplier A",
    "commissionPct": 13
  }
]
```
---

## 📁 Project Structure
```
hotel-offer-orchestrator/
│
├── 🐳 Dockerfile
├── 🐳 docker-compose.yml
├── 🧪 jest.config.js
├── 🧪 jest.setup.js
│
├── 📮 postman/
│   └── Hotel-Offer-Orchestrator.postman_collection.json
│
└── src/
    ├── server.ts
    ├── app.ts
    │
    ├── config/
    │   └── env.ts
    │
    ├── models/
    │   └── hotel.ts
    │
    ├── data/
    │
    ├── controllers/
    ├── routes/
    ├── middleware/
    ├── utils/
    │
    ├── services/
    │   ├── redisClient.ts
    │   └── hotelAggregationService.ts
    │
    ├── repositories/
    │   ├── redisKeys.ts
    │   └── hotelOfferRepository.ts
    │
    ├── temporal/
    │   ├── client.ts
    │   ├── worker.ts
    │   ├── taskQueue.ts
    │   ├── activities/
    │   └── workflows/
    │
    └── **/__tests__/
```
---

## 📋 Compliance

| Requirement | Status |
|---|---|
| Parallel supplier calls | ✅ |
| Batched aggregation | ✅ |
| Cheapest duplicate selection | ✅ |
| Redis persistence | ✅ |
| Redis-side filtering | ✅ |
| Temporal orchestration | ✅ |
| Activity retries | ✅ |
| Partial supplier failure | ✅ |
| Request tracing | ✅ |
| Automated tests | ✅ |
| Postman collection | ✅ |
| Docker Compose | ✅ |

---

## 🎯 Engineering Highlights

⚡ Parallel supplier orchestration
📦 Batched offer aggregation
🧹 Deterministic deduplication
🔁 Resilient Temporal workflows
🔴 Redis-native range queries
🛡️ Graceful partial failure handling
🐳 Reproducible Docker deployment
🧪 Automated unit & API testing

###### A focused backend system demonstrating workflow orchestration, batch processing, distributed-service resilience, Redis indexing, and clean separation of concerns.
