# SafeShelf: Smart Food Recall & Pantry Tracker

**SafeShelf** is a full-stack educational system that helps users **manage pantry inventory** while **checking U.S. FDA food-recall signals** backed by **[openFDA](https://open.fda.gov/)** Food Enforcement data. The **api-service** coordinates users, pantry items, recall checks, and alerts; the **recall-service** proxies and normalizes openFDA lookups; and the **React** dashboard presents analytics-friendly views for demos and coursework review.

SafeShelf illustrates a **microservice-style separation of concerns**, a normalized **PostgreSQL** schema on **Neon** (or any Postgres-compatible host), and **production-minded** practices—API documentation, structured logging, automated tests, containerized local runs, CI/CD on GitHub Actions, and optional cloud deployment (**Render**, **Vercel**).

---

## Features

| Area | Capability |
| --- | --- |
| **Accounts** | User management (`ADMIN` / `USER`) with REST endpoints |
| **Taxonomy** | Category management tied to pantry items |
| **Inventory** | Pantry item CRUD (product, quantity, expiry, storage, notes, barcode) |
| **FDA search** | On-demand FDA recall search through the orchestrated recall pipeline |
| **Recall automation** | Per-item recall check and bulk “check all” for a user’s pantry |
| **Alerts** | Recall alerts linked to pantry items with risk tiers and statuses |
| **Analytics** | Dashboard summary rollups for items, categories, recalls, and alerts |
| **API docs** | **Swagger UI** served from api-service (`/api/docs`) |
| **Observability** | Request logging and structured logs (Winston) on both Node services |
| **Quality** | Jest integration tests (`api-service`) and CI Postgres for realistic runs |
| **Containers** | `docker compose` brings up Postgres plus both backends |
| **CI/CD** | GitHub Actions: build/test matrix for api-service, recall-service, frontend |

---

## Architecture

SafeShelf uses **three application tiers** plus **PostgreSQL** and **openFDA** as external data:

```text
                    ┌─────────────────────┐
                    │       Browser       │
                    └──────────┬──────────┘
                               │ HTTPS
                               ▼
┌──────────────────────────────────────────────────────┐
│           React SPA (frontend, Vercel-ready)           │
│   VITE_API_BASE_URL → api-service REST + /api/docs     │
└────────────────────────────┬─────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────┐
│ api-service (Express, Render-ready) · PORT 5000        │
│  • REST: users, categories, pantry-items, recalls, …   │
│  • Prisma ORM · Neon Postgres                          │
│  • Proxies FDA search & checks → recall-service       │
└─────────────┬───────────────────────┬────────────────┘
              │ RECALL_SERVICE_URL      │
              │ (HTTP JSON)             │ DATABASE_URL
              ▼                         ▼
┌─────────────────────────┐   ┌────────────────────────┐
│ recall-service          │   │ Neon PostgreSQL         │
│ (Express · PORT 5001)    │   │ · durable pantry + recall│
│ · openFDA client         │   │   records                │
└─────────────┬───────────┘   └────────────────────────┘
              │
              ▼ HTTP
┌─────────────────────────┐
│ openFDA (external API)  │
│ Food Enforcement data   │
└─────────────────────────┘
```

Design notes:

- **frontend** consumes only **api-service**; it never calls openFDA or recall-service directly—good for **CORS**, **secrets**, and **grading clarity**.
- **recall-service** isolates FDA-specific HTTP, timeouts, and response shaping so **api-service** stays thin.
- **Neon PostgreSQL** (or Compose Postgres locally) backs all durable entities through **Prisma**.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| **Backend (API)** | Node.js · TypeScript · Express · Zod validation |
| **Backend (Recall)** | Node.js · TypeScript · Express · Axios |
| **Database** | PostgreSQL (recommended: Neon) |
| **ORM** | Prisma |
| **Frontend** | React · Vite · TypeScript · Tailwind CSS · React Router |
| **API documentation** | OpenAPI YAML · Swagger UI (`/api/docs`) |
| **Testing** | Jest · ts-jest · Supertest (`services/api-service`) |
| **Local deployment** | Docker Compose (`docker-compose.yml`) |
| **CI/CD** | GitHub Actions (`.github/workflows/ci.yml`) |

---

## Database design

Prisma defines **six tables** mapped to Postgres:

| Table | Purpose |
| --- | --- |
| **`users`** | Application users (`name`, `email`, `role`) |
| **`categories`** | Pantry taxonomy (`name`, optional `description`) |
| **`pantry_items`** | Items per user/category (SKU fields, qty, dates, notes) |
| **`recalls`** | FDA recall records keyed by **`openfdaEventId`** |
| **`recall_checks`** | Audit log each time inventory is checked against FDA data |
| **`recall_alerts`** | Alerts linking a **`user`**, **`pantry_item`**, and **`recall`** with risk + status |

**Relationships (conceptual)**

- **User → PantryItem** (one-to-many); deleting a user **cascades** pantry rows.
- **Category → PantryItem** (one-to-many); category delete is **restricted** if items reference it (protects taxonomy integrity).
- **PantryItem → RecallCheck** (one-to-many); cascading delete keeps history coherent with SKU lifecycle.
- **Recall → RecallAlert** (one-to-many).
- **User / PantryItem both → RecallAlert** (each alert ties an owner SKU to openFDA-derived recall rows); unique **`(pantryItemId, recallId)`** prevents duplicate alerts.

---

## API documentation (Swagger)

With **api-service** running locally:

- **Swagger UI:** [http://localhost:5000/api/docs](http://localhost:5000/api/docs)

Interactive docs are sourced from **`services/api-service/src/docs/openapi.yaml`**.

---

## Environment variables

Do **not** commit real secrets—use placeholders in coursework and `.env.example` locally.

### `services/api-service/.env`

```env
DATABASE_URL=
PORT=5000
NODE_ENV=development
RECALL_SERVICE_URL=http://localhost:5001
```

Copy from **`services/api-service/.env.example`** and fill **`DATABASE_URL`** (Neon or local Postgres).

### `services/recall-service/.env`

```env
PORT=5001
NODE_ENV=development
OPENFDA_API_KEY=
```

`OPENFDA_API_KEY` is **optional**: openFDA allows anonymous quotas; a key raises limits (see **`services/recall-service/.env.example`**).

### `frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Copy from **`frontend/.env.example`**. Production builds typically set this to **`https://<your-api-host>/api`**.

---

## Local setup

1. **Clone** this repository  
   ```bash
   git clone https://github.com/<your-org>/SafeShelf.git
   cd SafeShelf
   ```

2. **Install dependencies** in each runnable package:

   ```bash
   cd services/api-service && npm install && cd ../..
   cd services/recall-service && npm install && cd ../..
   cd frontend && npm install && cd ..
   ```

3. **Provision PostgreSQL on Neon** (free tier acceptable): create a project, grab the connection string (**`DATABASE_URL`**).

4. **Apply schema (Prisma)** from **`services/api-service`** using your Neon URL:

   ```bash
   cd services/api-service
   cp .env.example .env
   # Edit .env → set DATABASE_URL and RECALL_SERVICE_URL
   ```

   Sync the schema to the remote database (**this repo ships without a migrations folder**, so **`db push`** is the matching workflow for coursework):

   ```bash
   npx prisma generate
   npx prisma db push
   ```

   Once your team adds **`prisma/migrations`**, switch to repeatable deploy semantics:

   ```bash
   npx prisma migrate deploy
   ```

5. **Seed** sample identities and taxonomy (**optional**, requires seed script wired in `package.json`):

   ```bash
   npm run prisma:seed
   ```

6. **Start recall-service** (terminal 1):

   ```bash
   cd services/recall-service
   npm run dev
   ```

7. **Start api-service** (terminal 2):

   ```bash
   cd services/api-service
   npm run dev
   ```

8. **Start frontend** (terminal 3):

   ```bash
   cd frontend
   npm run dev
   ```

**Quick checks:** [`http://localhost:5000/api/health`](http://localhost:5000/api/health) · Swagger [`http://localhost:5000/api/docs`](http://localhost:5000/api/docs) ·Recall health [`http://localhost:5001/api/health`](http://localhost:5001/api/health)

---

## Docker setup

From the **repository root**:

```bash
docker compose build
docker compose up -d
```

This lifts **PostgreSQL**, **recall-service**, and **api-service** with networked defaults. Postgres is reachable from the host on the published map (often **`localhost:55432`**—see **`docker-compose.yml`** for overrides **`POSTGRES_HOST_PORT`**, **`API_SERVICE_HOST_PORT`**, **`RECALL_SERVICE_HOST_PORT`**).

Push Prisma schema from the running **`api-service`** container when needed:

```bash
docker compose exec api-service npx prisma db push
```

(or **`migrate deploy`** when migration history ships).

Compose reads optional root **`.env`** for keys such as **`OPENFDA_API_KEY`**.

---

## Testing

Automated verification lives primarily in **`services/api-service`**:

```bash
cd services/api-service
# Ensure DATABASE_URL targets a Postgres you can mutate (often local Compose or Neon scratch DB)
npm test
```

- **`integration.routes.test.ts`** exercises REST flows end-to-end (database required).
- **`health.test.ts`** smoke-tests **`GET /api/health`** without DB touchpoints.

Operational detail: **`TESTING.md`**, **`jest.config.js`**, and CI mirror **generate + schema push + Jest**.

---

## CI/CD

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on **`push`** and **`pull_request`** targeting **`main`**.

| Job | Steps (summary) |
| --- | --- |
| **api-service** | `working-directory` · Node 20 · `npm ci` · `npm run build` · ephemeral Postgres · `prisma generate` · `db push` · **`npm run test --if-present`** · dummy **`DATABASE_URL`** / **`RECALL_SERVICE_URL`** |
| **recall-service** | `npm ci` · `npm run build` |
| **frontend** | `npm ci` · `npm run build` (**`VITE_API_BASE_URL`** set for repeatable builds) |

This gives graders a reproducible signal: **typed builds pass**, and **contracts stay covered** where Jest suites exist.

---

## Deployment (Vercel + Neon)

SafeShelf ships with **Vercel adapters** (`api/index.ts` + `vercel.json`) for both Express services, so the entire stack runs on **Vercel** with **Neon** as the database. No real secrets belong in git—configure them in the Vercel dashboard.

### Neon (PostgreSQL)

1. Create a **Neon** project; copy the connection string (use the **pooler** variant: `…-pooler.<region>.neon.tech/...?sslmode=require`).
2. Locally, sync the schema once:

   ```bash
   cd services/api-service
   export DATABASE_URL="postgresql://...@...neon.tech/..."
   npx prisma generate
   npx prisma db push        # initial schema
   npm run prisma:seed       # optional starter data
   ```

   For migration history later, switch to **`npx prisma migrate deploy`**.

### Vercel projects (one repo → three projects)

Create three separate Vercel projects from the same GitHub repository. Each uses a different **Root Directory**.

#### 1. `safeshelf-recall` (deploy first — its URL is needed by api)

| Setting | Value |
| --- | --- |
| Root directory | `services/recall-service` |
| Framework preset | **Other** (auto-detects `vercel.json`) |
| Build command | *(default)* |
| Install command | *(default)* |

**Environment variables**

| Variable | Note |
| --- | --- |
| `OPENFDA_API_KEY` | Optional; omit for anonymous openFDA quotas |
| `NODE_ENV` | `production` |

Health probe after deploy: `https://<recall>.vercel.app/api/health`.

#### 2. `safeshelf-api`

| Setting | Value |
| --- | --- |
| Root directory | `services/api-service` |
| Framework preset | **Other** |
| Build command | *(default — `postinstall` runs `prisma generate`)* |

**Environment variables**

| Variable | Note |
| --- | --- |
| `DATABASE_URL` | Neon **pooler** connection string |
| `RECALL_SERVICE_URL` | `https://<recall>.vercel.app` (origin only — code appends `/api/...`) |
| `NODE_ENV` | `production` |

Health: `https://<api>.vercel.app/api/health` · Swagger: `https://<api>.vercel.app/api/docs`.

#### 3. `safeshelf-web` (frontend SPA)

| Setting | Value |
| --- | --- |
| Root directory | `frontend` |
| Framework preset | **Vite** *(auto-detected)* |
| Build command | `npm run build` |
| Output directory | `dist` |

**Environment variable**

```env
VITE_API_BASE_URL=https://<api>.vercel.app/api
```

(Note the **`https://`** prefix and the **`/api`** suffix.) Redeploy the frontend after changing it — Vite bakes env vars at build time.

### Why three projects, not one?

Each backend has its own `package.json`, `node_modules`, and runtime config. Splitting them keeps **install caches**, **cold starts**, and **failure domains** isolated, and matches the local microservice topology.

### Wiring & ordering

1. Deploy **recall-service** first; copy its URL.
2. Set **`RECALL_SERVICE_URL`** on the api-service project to that URL; redeploy the api project so it reads the new env.
3. Deploy the frontend with **`VITE_API_BASE_URL`** pointing at the api project; redeploy if you change it later.

### Deployed URLs (fill after go-live — placeholders only)

| Surface | Production URL *(replace with yours)* |
| --- | --- |
| **Frontend (Vercel)** | _`https://...vercel.app`_ |
| **API (Vercel)** | _`https://....vercel.app`_ |
| **Swagger docs** | _`https://....vercel.app/api/docs`_ |
| **Recall service (Vercel)** | _`https://....vercel.app/api/health`_ |

---

## Postman

Import **`postman/SafeShelf.postman_collection.json`**. Variables:

- **`baseUrl`** default `http://localhost:5000/api`
- **`userId`**, **`categoryId`**, **`pantryItemId`**, **`alertId`** — hydrate from POST/GET responses before chained calls.

---

## Future improvements

- **Production authentication:** OAuth2 / JWT / sessions; row-level tenancy hardening beyond demo user scoping
- **Barcode scanner integration** via device camera SDK
- **Email / push alerts** when recall tiers change (SendGrid, SNS, Twilio Send)
- **Native mobile companion** sharing the same REST contract
- **Advanced recall matching** (embeddings/fuzzy SKU ↔ FDA product lines, confidence scoring dashboards)

---

## Rubric alignment (grading map)

Replace left-column labels with wording from your course handout—the right column cites **artifacts** graders can inspect.

| Typical requirement category | Evidence in SafeShelf |
| --- | --- |
| Problem scope & usefulness | Narrative §1 · dashboard + recalls domain |
| Relational persistence | Six-table Prisma model · FK / cascade semantics |
| REST API completeness | Modular routes (`users`, `categories`, `pantry-items`, `recalls`, `alerts`, `dashboard`, `/api/docs`) |
| External integration | **`recall-service`** + orchestration from **`api-service`** ↔ openFDA |
| Client application | **`frontend`** React SPA |
| API documentation | OpenAPI **`openapi.yaml`** + Swagger UI **`/api/docs`** |
| Code quality | TypeScript everywhere · Zod validation · centralized error handling |
| Logging / observability | Winston + request logging ([`middleware`](services/api-service/src/middleware/), recall-service analog) |
| Automated testing | **`npm test`** + integration suite **[`integration.routes.test.ts`](services/api-service/src/tests/integration.routes.test.ts)** |
| Containerization | **`docker compose`** reproducible topology |
| DevOps / CI | GitHub Actions build & test pipelines |
| Deployment literacy | Neon + Render + Vercel section + placeholders **Deployed URLs** |
| Maintainability docs | README + **`TESTING.md`** + `.env.example` files |

---

## Additional repository references

| Path | Meaning |
| --- | --- |
| `services/api-service/` | REST + Prisma + Swagger |
| `services/recall-service/` | openFDA adapter microservice |
| `frontend/` | React UI |
| `docker-compose.yml` | Local infra |
| `.github/workflows/ci.yml` | CI definition |
| `postman/` | Postman workspace export |

---

## License / coursework

Educational submission—see course policy for originality and citations. External data © FDA / openFDA; query usage must respect [openFDA Terms](https://open.fda.gov/terms/).
