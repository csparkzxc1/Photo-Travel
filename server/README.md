# Photo Travel — Backend

Fastify + Drizzle ORM + PostgreSQL/PostGIS API for the Photo Travel mobile app.
Server-side region matching uses PostGIS `ST_Contains` against a GIST-indexed
geometry column, dramatically faster than client-side polygon checks once the
dataset crosses ~100 regions × millions of photos.

## Quick start

```bash
cd server
cp .env.example .env
npm install
npm run docker:up        # postgres + postgis on :5432
npm run db:migrate       # apply migrations/*.sql
npm run dev              # tsx watch on :4000
```

Health check:

```bash
curl localhost:4000/healthz
# → {"ok":true,"ts":"..."}
```

Dev login (replace with Apple/Google/Kakao OIDC for prod):

```bash
curl -X POST localhost:4000/auth/dev-login \
  -H 'content-type: application/json' \
  -d '{"email":"demo@example.com","nickname":"Demo"}'
# → {"token":"eyJ...","user":{...}}
```

## Architecture

```
src/
├── app.ts               buildApp(deps) — pure factory, used by index.ts and tests
├── index.ts             prod entrypoint: load env, open DB, listen
├── config.ts            zod-validated env schema
├── auth/
│   └── plugin.ts        @fastify/jwt + `app.authenticate` decorator
├── db/
│   ├── schema.ts        Drizzle tables (with PostGIS custom types)
│   ├── client.ts        postgres-js + drizzle wiring
│   └── migrate.ts       runs migrations/*.sql in lexicographic order
├── domain/
│   ├── types.ts         API-shape types (snake→camel)
│   ├── dao.ts           Dao interface — the only thing routes depend on
│   └── visits.ts        pure aggregation + diff (testable, no DB)
├── routes/              one file per resource, depend on a Dao
└── infra/
    └── pgDao.ts         Postgres+PostGIS implementation of Dao
```

Routes never talk to Drizzle directly — they use the `Dao` interface. The real
`createPgDao(db)` lives in `infra/`, and tests use an `InMemoryDao` from
`tests/inMemoryDao.ts`. Same Fastify app, same handlers, just a different
backing store. This means `npm test` runs end-to-end against `app.inject()`
without docker or postgres.

## Endpoints

| Method | Path                         | Auth | Purpose |
|--------|------------------------------|------|---------|
| GET    | `/healthz`                   | —    | Liveness probe |
| POST   | `/auth/dev-login`            | —    | Issue JWT (dev only) |
| GET    | `/regions/:countryCode`      | —    | Region metadata at `?level=1\|2\|3` |
| POST   | `/sync/photos`               | JWT  | Batch upload (≤500); server matches via `ST_Contains` |
| GET    | `/me/visits`                 | JWT  | Per-region aggregate for caller |
| GET    | `/me/trips?limit=50`         | JWT  | Recent trips |
| GET    | `/ranking/friends`           | JWT  | Caller + friends ordered by visit count |

## PostGIS quirks

- `regions.geom` is `GEOMETRY(MultiPolygon, 4326)` with a GIST index.
- `photos.location` is `GEOGRAPHY(Point, 4326)` — `geography` is more accurate
  for distance work later (haversine on the sphere) and indexes the same way.
- `ST_Contains(geom, ST_SetSRID(ST_MakePoint(lng, lat), 4326))` is the hot path.
  PostGIS uses the bbox prefilter from the GIST index automatically.
- `ST_X / ST_Y` extract lng/lat from the geography point (cast to geometry first).

## Tests

```bash
npm test                 # vitest, 13 tests across handlers + domain
npm run typecheck
```

The route tests boot the real Fastify app with the InMemoryDao, exercise JWT
auth, validation, and happy paths, and assert response shapes — no docker
needed for CI.

## Loading region data

After `npm run db:migrate`, load production GeoJSON:

```bash
psql $DATABASE_URL -c "INSERT INTO countries (code, name_ko, name_en, flag_emoji, total_regions, supported_level) VALUES ('KR', '대한민국', 'South Korea', '🇰🇷', 229, 2)"

# Use ogr2ogr to import:
ogr2ogr -f PostgreSQL "PG:$DATABASE_URL" \
  ../assets/geo/kr_sigungu.geojson \
  -nln regions -append -lco GEOMETRY_NAME=geom \
  -s_srs EPSG:4326 -t_srs EPSG:4326
```
