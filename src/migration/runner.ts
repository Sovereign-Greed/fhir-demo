import { getDb } from "../db/connection.js";
import {
  patientExists,
  upsertObservation,
  upsertPatient,
} from "../db/repositories.js";
import {
  fetchPages,
  getNextUrl,
  searchUrl,
  type FhirBundle,
  type FhirResourceType,
} from "../fhir/client.js";
import { parseObservation, parsePatient } from "../fhir/parser.js";
import { createMigrationLogger } from "./logger.js";
import {
  completeRun,
  createRun,
  failRun,
  findResumableRun,
  getLatestRun,
  markRunning,
  updateRunProgress,
  type MigrationRun,
} from "./runs.js";

export interface MigrateOptions {
  limit?: number;
  resume?: boolean;
  only?: FhirResourceType;
}

const RESOURCE_ORDER: FhirResourceType[] = ["Patient", "Observation"];

let activeRunId: number | null = null;

export function getActiveRunId(): number | null {
  return activeRunId;
}

export async function runMigration(options: MigrateOptions = {}): Promise<void> {
  const startedAt = Date.now();
  const types = options.only ? [options.only] : RESOURCE_ORDER;
  const summary: Array<{ type: FhirResourceType; saved: number; errors: number }> =
    [];

  getDb();

  for (const resourceType of types) {
    const result = await migrateResourceType(resourceType, options);
    summary.push({
      type: resourceType,
      saved: result.saved,
      errors: result.errors,
    });
  }

  const durationSec = Math.round((Date.now() - startedAt) / 1000);
  const parts = summary
    .map((item) => `${item.type}: ${item.saved} saved, ${item.errors} errors`)
    .join(" | ");

  console.log(`Migration complete | ${parts} | Duration: ${durationSec}s`);
}

async function migrateResourceType(
  resourceType: FhirResourceType,
  options: MigrateOptions,
): Promise<{ saved: number; errors: number }> {
  if (options.resume) {
    const latest = getLatestRun(resourceType);
    if (latest?.status === "completed") {
      console.log(`${resourceType} already completed. Skipping.`);
      return { saved: latest.saved, errors: latest.errors };
    }
  }

  const run = resolveRun(resourceType, options.resume ?? false);
  const logger = createMigrationLogger(run.id);
  activeRunId = run.id;

  let fetched = run.fetched;
  let saved = run.saved;
  let errors = run.errors;
  let pageNumber = 0;

  const startUrl =
    options.resume && run.last_page_url
      ? run.last_page_url
      : undefined;

  logger.info("phase_start", {
    resourceType,
    runId: run.id,
    resume: Boolean(startUrl),
    limit: options.limit ?? null,
    startUrl: startUrl ?? searchUrl(resourceType),
  });

  try {
    for await (const bundle of fetchPages(resourceType, { startUrl })) {
      pageNumber += 1;
      const pageStart = Date.now();
      const pageResult = saveBundlePage(
        resourceType,
        bundle,
        options.limit,
        saved,
      );

      fetched += pageResult.fetched;
      saved += pageResult.saved;
      errors += pageResult.errors;

      const nextUrl = getNextUrl(bundle);
      updateRunProgress(run.id, {
        fetched,
        saved,
        errors,
        lastPageUrl: nextUrl ?? null,
      });

      logger.info("page_complete", {
        resourceType,
        page: pageNumber,
        entries: pageResult.saved,
        totalSaved: saved,
        errors: pageResult.errors,
        durationMs: Date.now() - pageStart,
      });

      if (options.limit !== undefined && saved >= options.limit) {
        break;
      }

      if (!nextUrl) {
        break;
      }
    }

    completeRun(run.id);
    logger.info("phase_complete", { resourceType, saved, errors });
    return { saved, errors };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    failRun(run.id, message);
    logger.error("phase_failed", { resourceType, message });
    throw error;
  } finally {
    if (activeRunId === run.id) {
      activeRunId = null;
    }
  }
}

function resolveRun(
  resourceType: FhirResourceType,
  resume: boolean,
): MigrationRun {
  if (resume) {
    const existing = findResumableRun(resourceType);
    if (existing) {
      markRunning(existing.id);
      return { ...existing, status: "running" };
    }
  }

  return createRun(resourceType);
}

function saveBundlePage(
  resourceType: FhirResourceType,
  bundle: FhirBundle,
  limit: number | undefined,
  savedSoFar: number,
): { fetched: number; saved: number; errors: number } {
  const entries = bundle.entry ?? [];
  let fetched = 0;
  let saved = 0;
  let errors = 0;

  const savePage = getDb().transaction(() => {
    for (const entry of entries) {
      if (!entry.resource) {
        continue;
      }

      fetched += 1;

      if (limit !== undefined && savedSoFar + saved >= limit) {
        return;
      }

      try {
        if (resourceType === "Patient") {
          upsertPatient(parsePatient(entry.resource));
        } else {
          upsertObservation(
            parseObservation(entry.resource, { patientExists }),
          );
        }
        saved += 1;
      } catch (error) {
        errors += 1;
        console.warn(
          `Skipped ${resourceType.toLowerCase()}:`,
          (error as Error).message,
        );
      }
    }
  });

  savePage();
  return { fetched, saved, errors };
}
