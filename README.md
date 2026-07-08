# FHIR Migration Demo

A small demo that pulls **Patient** and **Observation** data from the public HAPI FHIR sandbox and stores it locally in SQLite.

See [Plan.md](./Plan.md) for the full approach.

## Setup

Requires Node.js 20+.

```bash
npm install
cp .env.example .env
```

Config lives in `.env`. Defaults point at `https://hapi.fhir.org/baseR4` and `./data/migration.db`.

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
npm run db:check       # verify SQLite setup
npm run fhir:check     # test FHIR paging from sandbox
npm run migrate:check    # fetch 1 page per type and save to db
```

### Options

Pass flags directly to the migrate script:

```bash
npx tsx scripts/migrate.ts --limit 50
npx tsx scripts/migrate.ts --only Patient
npx tsx scripts/migrate.ts --resume
```

Patients are migrated first, then observations. Progress is logged to stdout and `logs/migration-{runId}.log`. Checkpoints are stored in the `migration_runs` table so a failed run can be resumed with `--resume`.

Migrated data is written to `data/migration.db` (gitignored).

### Interrupt and resume

Stop a running migration with `Ctrl+C`. The current phase is marked failed and the last completed page checkpoint is kept in `migration_runs`.

Resume where it left off:

```bash
npm run migrate:resume
```

Or:

```bash
npx tsx scripts/migrate.ts --resume
```

Resume skips resource types that already completed and continues from the saved `last_page_url` for any interrupted phase. Already-saved records are safe to upsert again.
