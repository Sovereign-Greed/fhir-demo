import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

let tempDir: string | undefined;

export async function setupTestDb(): Promise<void> {
  tempDir = mkdtempSync(path.join(tmpdir(), "fhri-test-"));
  process.env.DATABASE_PATH = path.join(tempDir, "test.db");

  const { closeDb, getDb } = await import("../../src/db/connection.js");
  closeDb();
  getDb();
}

export async function teardownTestDb(): Promise<void> {
  const { closeDb } = await import("../../src/db/connection.js");
  closeDb();

  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  }
}
