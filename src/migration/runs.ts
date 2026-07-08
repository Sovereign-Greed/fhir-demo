import { getDb } from "../db/connection.js";
import type { FhirResourceType } from "../fhir/client.js";

export type RunStatus = "running" | "completed" | "failed";

export interface MigrationRun {
  id: number;
  started_at: string;
  finished_at: string | null;
  status: RunStatus;
  resource_type: string;
  fetched: number;
  saved: number;
  errors: number;
  last_page_url: string | null;
  error_message: string | null;
}

export function createRun(resourceType: FhirResourceType): MigrationRun {
  const startedAt = new Date().toISOString();

  const result = getDb()
    .prepare(
      `INSERT INTO migration_runs (
        started_at, status, resource_type
      ) VALUES (?, 'running', ?)`,
    )
    .run(startedAt, resourceType);

  return getRun(Number(result.lastInsertRowid))!;
}

export function getRun(id: number): MigrationRun | undefined {
  return getDb()
    .prepare("SELECT * FROM migration_runs WHERE id = ?")
    .get(id) as MigrationRun | undefined;
}

export function getLatestRun(
  resourceType: FhirResourceType,
): MigrationRun | undefined {
  return getDb()
    .prepare(
      `SELECT * FROM migration_runs
       WHERE resource_type = ?
       ORDER BY id DESC
       LIMIT 1`,
    )
    .get(resourceType) as MigrationRun | undefined;
}

export function findResumableRun(
  resourceType: FhirResourceType,
): MigrationRun | undefined {
  return getDb()
    .prepare(
      `SELECT * FROM migration_runs
       WHERE resource_type = ? AND status IN ('running', 'failed')
       ORDER BY id DESC
       LIMIT 1`,
    )
    .get(resourceType) as MigrationRun | undefined;
}

export function markRunning(id: number): void {
  getDb()
    .prepare(
      `UPDATE migration_runs
       SET status = 'running', finished_at = NULL, error_message = NULL
       WHERE id = ?`,
    )
    .run(id);
}

export function updateRunProgress(
  id: number,
  data: {
    fetched: number;
    saved: number;
    errors: number;
    lastPageUrl: string | null;
  },
): void {
  getDb()
    .prepare(
      `UPDATE migration_runs
       SET fetched = ?, saved = ?, errors = ?, last_page_url = ?
       WHERE id = ?`,
    )
    .run(data.fetched, data.saved, data.errors, data.lastPageUrl, id);
}

export function completeRun(id: number): void {
  getDb()
    .prepare(
      `UPDATE migration_runs
       SET status = 'completed', finished_at = ?, last_page_url = NULL
       WHERE id = ?`,
    )
    .run(new Date().toISOString(), id);
}

export function failRun(id: number, message: string): void {
  getDb()
    .prepare(
      `UPDATE migration_runs
       SET status = 'failed', finished_at = ?, error_message = ?
       WHERE id = ?`,
    )
    .run(new Date().toISOString(), message, id);
}
