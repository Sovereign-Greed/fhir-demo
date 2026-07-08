import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureDataDirectory, resolveDatabasePath } from "../config.js";

const schemaPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "schema.sql",
);

let db: Database.Database | undefined;

export function getDb(): Database.Database {
  if (!db) {
    ensureDataDirectory();
    db = new Database(resolveDatabasePath());
    db.pragma("foreign_keys = ON");
    db.exec(readFileSync(schemaPath, "utf8"));
  }

  return db;
}

export function closeDb(): void {
  db?.close();
  db = undefined;
}

export function listTables(): string[] {
  const rows = getDb()
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    )
    .all() as Array<{ name: string }>;

  return rows.map((row) => row.name);
}
