# FHIR Migration Demo

A small demo that pulls **Patient** and **Observation** data from the public HAPI FHIR sandbox and stores it locally in SQLite.

See [Plan.md](./Plan.md) for the full approach.

## Prerequisites

- **Node.js 20+** (see `.nvmrc`)
- **npm**
- Network access to `https://hapi.fhir.org`

`better-sqlite3` ships prebuilt binaries for most platforms. If `npm install` fails to compile it, install your platform build tools (on Windows: Visual Studio Build Tools with C++ workload).

## Setup

```bash
npm install
cp .env.example .env   # Windows: copy .env.example .env
```

Config lives in `.env`. Defaults point at `https://hapi.fhir.org/baseR4` and `./data/migration.db`.

### Verify your environment

Run this after install to confirm everything builds:

```bash
npm run check
```

That runs typecheck, tests, and a production web build. You can also run steps individually:

```bash
npm run typecheck
npm test
npm run build:web
```

## Ports

| Service | Default port | Env var |
|---|---|---|
| API | 3001 | `API_PORT` |
| Web app | 3010 | `WEB_PORT` |

If a port is already in use:

```bash
npm run kill-ports
```

## Quick start (full demo)

```bash
npm install
cp .env.example .env
npm run migrate:dev
npm run dev:api     # terminal 1
npm run dev:web     # terminal 2
```

Open `http://localhost:3010`.

## Run migrations

Quick test (20 patients + 20 observations):

```bash
npm run migrate:dev
```

Full migration (no limit, can take a while):

```bash
npm run migrate
```

Other useful commands:

```bash
npm run db:check
npm run fhir:check
npm run migrate:check
```

### Options

On Windows, pass flags with `npx` (npm may not forward `--` args reliably):

```bash
npx tsx scripts/migrate.ts --limit 50
npx tsx scripts/migrate.ts --only Patient
npx tsx scripts/migrate.ts --resume
```

Patients are migrated first, then observations. Progress is logged to stdout and `logs/migration-{runId}.log`. Checkpoints are stored in the `migration_runs` table so a failed run can be resumed with `--resume`.

Migrated data is written to `data/migration.db` (gitignored).

### Interrupt and resume

Stop a running migration with `Ctrl+C`. The current phase is marked failed and the last completed page checkpoint is kept in `migration_runs`.

```bash
npm run migrate:resume
```

Resume skips resource types that already completed and continues from the saved `last_page_url`. Already-saved records are safe to upsert again.

## API

```bash
npm run dev:api
```

Examples:

```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/migration/status
curl "http://localhost:3001/api/patients?limit=10&search=ramirez"
```

## Web app

You need **both** the API and the web app running. The UI reads from the API, not SQLite directly.

```bash
npm run dev:api   # terminal 1
npm run dev:web   # terminal 2
```

Open `http://localhost:3010`.

Production build:

```bash
npm run build:web
```

Output goes to `dist/`. The built app still needs the API running to load data.

## Tests

```bash
npm test
```

Uses an isolated temp database. Does not touch `data/migration.db`.

## Troubleshooting

### Blank page or stuck on "Loading app..."

1. Stop duplicate servers: `npm run kill-ports`
2. Start API first, then web
3. Hard refresh the browser (Ctrl+Shift+R)
4. Check the browser console and the message on the page for JavaScript errors

### No data in the UI

1. Confirm API is running: `curl http://localhost:3001/api/health`
2. Confirm data exists: `curl http://localhost:3001/api/migration/status`
3. If counts are zero, run `npm run migrate:dev`

### Port already in use

```bash
npm run kill-ports
```

Or change `API_PORT` / `WEB_PORT` in `.env` and restart both servers.

### `npm run migrate -- --limit 20` ignores the limit (Windows)

Use one of these instead:

```bash
npm run migrate:dev
npx tsx scripts/migrate.ts --limit 20
```

### API starts then exits

Another process may already be on port 3001. Run `npm run kill-ports` and try again. The API must stay running in its terminal.

### `npm install` fails on better-sqlite3

Install platform build tools and retry. On Windows, use Visual Studio Build Tools with the C++ workload.

### Migration is slow or times out

The public HAPI sandbox is shared. Use `npm run migrate:dev` for testing. For full runs, expect long runtimes and use `npm run migrate:resume` if interrupted.

## Scripts reference

| Script | Purpose |
|---|---|
| `npm run check` | Typecheck + test + web build |
| `npm run migrate:dev` | Small test migration |
| `npm run migrate` | Full migration |
| `npm run migrate:resume` | Resume interrupted migration |
| `npm run dev:api` | Start REST API |
| `npm run dev:web` | Start React dev server |
| `npm run kill-ports` | Free ports 3001/3010/3011 |
| `npm test` | Run test suite |

## AI usage

This project was built with AI assistance (Cursor). Below is how it was used.

### App scaffolding and implementation

AI helped set up and implement most of the codebase:

- **Project structure** — Node.js + TypeScript layout, `package.json` scripts, env config, and `.gitignore`
- **Migration pipeline** — FHIR client, parsers, SQLite schema/repos, migration runner, resume/checkpoint logic, and CLI scripts (`migrate`, `db:check`, `fhir:check`, `kill-ports`)
- **API** — Express app, routes (`/api/health`, `/api/migration/status`, patients, observations), and pagination
- **Web app** — React + Vite setup, routing, pages (dashboard, patient list, patient detail), shared components, and API client
- **Tests** — parser, database query, and API endpoint tests with an isolated temp DB
- **Docs and tooling** — `README.md`, `Plan.md` updates, troubleshooting notes, and `npm run check` for cross-env verification

### Data analysis from API endpoints

AI was used to inspect and reason about migrated data by calling the API during development:

- Checking `/api/migration/status` for patient/observation counts and run state
- Spot-checking `/api/patients` and `/api/patients/:id/observations` to confirm records, linking, and pagination
- Diagnosing “no data” and blank-page issues by correlating API responses with what the UI expected

### Other ways AI helped

- **Debugging** — Windows-specific fixes (Vite root/`index.html` layout, port conflicts, `npm run migrate --` flag forwarding)
- **Schema design** — `subject_type` / `subject_id` / nullable `patient_id` for observation–patient relationships
- **Iteration** — refining migration interrupt/resume behavior, README troubleshooting, and cross-platform `kill-ports`
- **Code review** — sanity checks on idempotent upserts, error handling, and test coverage gaps

Human direction drove scope and priorities (keep it simple, patients first, demo-only safety). AI accelerated implementation; final review and run decisions were made in the IDE.
