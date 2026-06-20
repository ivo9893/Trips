# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project

**Палатки** — a camping-trip planner that replaces a Bulgarian Excel sheet. It tracks
attendance, meat per night, drinks, a shopping list, gear, a live tally, a
shopping-duty fortune wheel, and an activity log. Supports multiple trips.

The **UI language is Bulgarian** — all user-facing strings, labels, and seeded data
are in Bulgarian. Keep new UI text in Bulgarian and match the existing tone.

## Stack & layout

- **Client:** React 18 + Vite + TypeScript + Tailwind CSS — `client/`
- **Server:** Express + TypeScript REST API — `server/`
- **Database:** PostgreSQL via the [`postgres`](https://github.com/porsager/postgres) library (tagged-template queries)
- Monorepo with a root `package.json` orchestrating both via `concurrently`.

```
server/src/
  schema.sql   # PostgreSQL schema, applied on startup (CREATE TABLE IF NOT EXISTS)
  db.ts        # postgres() client from DATABASE_URL; exports `sql` and `db` (alias); initSchema()
  seed.ts      # one-off import from seed-data.json (the original spreadsheet)
  log.ts       # activity-log middleware + Bulgarian action describer
  routes/      # lists, trips, participants, shopping, tally, wheel, log
client/src/
  api.ts       # typed fetch client + setActor()
  store.tsx    # React context: current trip, lookup lists, identity ("me")
  components/  # Layout, MultiSelect, Logo, IdentityGate, ui
  pages/       # Trips, Roster, Drinks, Shopping, Gear, Tally, Wheel, Log, Lists
```

## Commands

```bash
npm run install:all   # install root + server + client
npm run seed          # (re)load the DB from server/src/seed-data.json
npm run dev           # API on :3001 + client on :5173 (Vite proxies /api -> 3001)
npm run build         # production build of client + server (installs deps, copies schema.sql)
npm start             # run the compiled server (also serves client/dist)
```

- The server reads `server/.env` in dev (`--env-file=.env`). Set `DATABASE_URL` there.
- There is **no test suite**. Verify changes by running `npm run dev` and exercising the
  API/UI. Type-check the client with `npm --prefix client run build` or `tsc --noEmit`.

## Database conventions

- Queries use the `postgres` tagged template: `` await db`SELECT ... WHERE id = ${id}` ``.
  Values are parameterised automatically — **never** string-concatenate SQL.
- Transactions use `await db.begin(async (sql) => { ... })`.
- `COUNT(*)` returns a string (bigint) — convert with `Number(...)` before sending JSON.
- Schema is **idempotent**: add new tables/columns to `schema.sql` with
  `IF NOT EXISTS`; they're applied on every server start. No migration tool.
- "Dynamic lists" (people, meats, drinks, locations, bring_items, gear_items) are
  lookup tables edited in the **Списъци** page and referenced by junction tables.
  When adding a new selectable concept, follow this pattern (lookup table + junction).

## Gotchas / conventions

- **Activity log:** `activityLogger` middleware logs every successful mutation. It must
  snapshot `req.method`/`req.path` **at entry** — Express strips the mounted `/api`
  prefix during routing, so reading them inside `res.on('finish')` gives the wrong path.
  Add human-readable Bulgarian descriptions for new routes in `log.ts` → `describe()`.
- **Actor attribution:** the client sends the current user via the `X-Actor` header
  (URI-encoded, since headers must be ASCII). `setActor()` in `api.ts` keeps it in sync.
- **Ports:** server listens on `PORT || API_PORT || 3001`. Keep it off Vite's 5173.
- **Build copies `schema.sql`:** `tsc` doesn't emit non-TS files, but the runtime reads
  `dist/schema.sql`. The server `build` script copies it — preserve that if you touch it.
- **Identity / personal view:** `store.tsx` holds `me` (a person) and `showAll`. The
  Roster and Drinks pages filter to the current user unless `showAll` is set.
- Timestamps from Postgres are full ISO strings (`...Z`); parse accordingly on the client.

## Deployment

Single Render web service (Express serves the React build):
- Build: `npm install; npm run build` · Start: `npm start`
- Env: `DATABASE_URL` (required), `PORT` (provided by Render)

## House rules

- Keep UI strings Bulgarian. Match surrounding code style (Tailwind utility classes,
  the `.card` / `.btn-*` component classes in `client/src/index.css`).
- Commit/push only when asked. `main` is the deploy branch — a push triggers Render.
