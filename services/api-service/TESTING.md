# SafeShelf api-service tests

Integration tests exercise the real Express router via **Supertest**, backed by PostgreSQL using **Prisma**. External recall traffic is stubbed (`invokeRecallMicroserviceSearch`) — **nothing calls OpenFDA in CI**.

## Prereqs

- Node 22+ (same as CI)
- A reachable Postgres compatible with Prisma **`schema.prisma`**
- `npm install`

## Env

| Variable               | Meaning |
|------------------------|---------|
| `DATABASE_URL`         | Required in CI. Locally, if unset, `src/config/env.ts` fills a dev default (`postgresql://postgres:postgres@localhost:5432/safeshelf` or `API_SERVICE_DEV_DATABASE_FALLBACK`); **`PrismaClient` uses this resolved URL** so it stays in sync with the app env. Prefer an explicit `.env.test` URL for predictable isolation.
| `RECALL_SERVICE_URL`   | Optional in tests (`loadEnv.ts` injects dummy `http://127.0.0.1:59999`; HTTP mocked anyway). |
| `.env.test`            | Optional; loaded before `.env`. |

Recommended local flow:

```bash
cd services/api-service
createdb safeshelf_test   # adjust for your Postgres tooling — once per machine
echo 'DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/safeshelf_test"' >> .env.test
```

## Applying schema before first run

Migrations aren’t bundled in-repo yet; hydrate the schema with:

```bash
npx prisma db push
```

## Commands

```bash
npm test            # sequential Jest (--runInBand avoids Prisma contention)
npm run test:ci     # prisma generate + db push + tests (matches GitHub Actions job)
```

## GitHub Actions

`.github/workflows/ci.yml` spins up Postgres 15, exports `DATABASE_URL`, runs **`npm ci`** + **`npm run test:ci`** under `services/api-service`.
