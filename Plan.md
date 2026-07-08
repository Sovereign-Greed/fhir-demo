# FHIR Migration Demo Plan

Migrate Patient and Observation resources from the HAPI FHIR sandbox (https://hapi.fhir.org/baseR4) into a local SQLite file, then serve them through a small Node.js REST API and a lightweight React app. Keep it simple: one migration script, one database file, no job queues or extra infrastructure.

## Overall approach

The migration script pulls data from the sandbox in order, writes it to SQLite, and tracks progress in logs and a `migration_runs` table. Patients go first, then Observations, since observations reference patients through `subject`.

For reliability, each FHIR search returns a paginated Bundle. We follow the `next` link until there are no more pages. Resources are upserted by FHIR id, so re-running the migration does not create duplicates. Each page is written in a single transaction. If the process crashes, a resume option picks up from the last saved page URL in `migration_runs`. HTTP calls retry up to 3 times with exponential backoff on 429, 5xx, and network errors. A bad individual record gets logged and skipped; it does not stop the whole run.

The public HAPI server is shared and can time out if you hit it too hard. We fetch one page at a time with a short delay between requests (around 300ms by default), use `_count=50` to cut down on round-trips, and respect `Retry-After` when the server sends it. If pages keep failing, the run is marked failed and the checkpoint is kept so you can try again.

For observability, logs go to stdout and to `logs/migration-{runId}.log`. Each page logs the resource type, how many entries were saved, running totals, and how long it took. The `migration_runs` table holds status, counters (fetched, saved, errors), and the last checkpoint. The API exposes this at `GET /api/migration/status` for the React dashboard. When the run finishes, print a summary with counts, errors, and total time.

Stack: Node.js, TypeScript, better-sqlite3, Express, Vite, React. Three commands: `npm run migrate`, `npm run dev:api`, `npm run dev:web`.

## Data mapping

Store the full FHIR resource as `raw_json` and pull out flat fields for listing and display.

Patient (FHIR R4 to `patients` table):

| Field | Source |
|---|---|
| id | Patient.id |
| family | name[0].family |
| given | name[0].given, joined |
| birth_date | birthDate |
| gender | gender |
| raw_json | full resource |
| migrated_at | migration timestamp |

Observation (FHIR R4 to `observations` table):

| Field | Source |
|---|---|
| id | Observation.id |
| subject_type | Observation.subject.reference (the resource type portion) |
| subject_id | Observation.subject.reference (the id portion) |
| subject_display | Observation.subject.display (if present) |
| patient_id | set when `subject_type` is `Patient` and that patient already exists locally; otherwise null |
| status | status |
| code | code.coding[0].display or code.text |
| effective | effectiveDateTime or effectivePeriod.start |
| value | first value[x] field found, turned into a display string |
| raw_json | full resource |
| migrated_at | migration timestamp |

We store the full subject reference using `subject_type`, `subject_id`, and `subject_display` so the relationship stays accurate even when the observation is not about a Patient. `patient_id` is a convenience field for fast joins in the demo UI; it may be null when the subject is not a Patient or when the referenced Patient record was not loaded (or not found) yet.

## Validation

Check three things after a migration:

Run level: `migration_runs` should show completed status, errors at or near zero, and saved counts that match what you expect. Compare against Bundle.total from the first page of each resource type when the sandbox provides it.

Record level: spot-check patients and observations. Confirm id and key fields in SQLite match the source JSON. Observations with a patient_id should point to a patient that exists. Log orphaned references instead of ignoring them.

API level: call the patients and observations endpoints and confirm counts and sample records look right in the React UI.

For local dev, support a limit flag to migrate only N records per resource type so you can validate against a small set quickly.

## Safety

This demo uses public sandbox data, not real PHI. A production version would need:

Encryption at rest on the database and any backups or logs that hold resource payloads. Access control on the API with least-privilege roles. Do not expose the database file or migration logs on the network. Audit logging for who read which patient records, separate from migration progress logs. Store only what the app needs; do not dump full FHIR JSON into logs. Redact identifiers in non-production environments. TLS on all FHIR and API traffic. A retention policy and a way to securely delete data when it is no longer needed.

The demo skips auth and encryption to keep scope small. You would need those before handling real patient data.

## Rollback

If something goes wrong mid-migration:

Stop. The script marks the current run as failed and saves the last good page URL. Nothing else gets written.

Check the logs and `migration_runs` to see how far it got and what failed. The database may already have a partial but consistent set of committed pages.

Then pick a path. Resume from the saved checkpoint (safe because upserts are idempotent). Or wipe the SQLite file and start over, which is simplest if the partial data is not worth keeping. In production you would restore from a pre-migration backup; the demo does not do that automatically.

Do not run migration and heavy API writes at the same time. For the demo, migrate first, then start the API. That avoids SQLite lock issues and makes rollback as simple as replacing one file.

The API and React app just read whatever is in the database. A failed migration only means the data may be incomplete until you resume or re-run successfully.
