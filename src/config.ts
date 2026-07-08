import "dotenv/config";
import { mkdirSync } from "node:fs";
import path from "node:path";

export const config = {
  fhirBaseUrl: process.env.FHIR_BASE_URL ?? "https://hapi.fhir.org/baseR4",
  databasePath: process.env.DATABASE_PATH ?? "./data/migration.db",
  requestDelayMs: Number(process.env.REQUEST_DELAY_MS ?? 300),
  pageSize: Number(process.env.PAGE_SIZE ?? 50),
  maxRetries: Number(process.env.MAX_RETRIES ?? 3),
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS ?? 30_000),
  apiPort: Number(process.env.API_PORT ?? 3001),
};

export function resolveDatabasePath(): string {
  return path.resolve(process.env.DATABASE_PATH ?? "./data/migration.db");
}

export function ensureDataDirectory(): void {
  mkdirSync(path.dirname(resolveDatabasePath()), { recursive: true });
}
