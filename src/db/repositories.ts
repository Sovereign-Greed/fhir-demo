import { getDb } from "./connection.js";
import type { ObservationRow, PatientRow } from "../fhir/parser.js";

const upsertPatientStmt = () =>
  getDb().prepare(`
    INSERT OR REPLACE INTO patients (
      id, family, given, full_name, birth_date, gender, raw_json, migrated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

const upsertObservationStmt = () =>
  getDb().prepare(`
    INSERT OR REPLACE INTO observations (
      id, subject_type, subject_id, patient_id, subject_display,
      status, code, effective, value, raw_json, migrated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

export function upsertPatient(row: PatientRow): void {
  upsertPatientStmt().run(
    row.id,
    row.family,
    row.given,
    row.full_name,
    row.birth_date,
    row.gender,
    row.raw_json,
    row.migrated_at,
  );
}

export function upsertObservation(row: ObservationRow): void {
  upsertObservationStmt().run(
    row.id,
    row.subject_type,
    row.subject_id,
    row.patient_id,
    row.subject_display,
    row.status,
    row.code,
    row.effective,
    row.value,
    row.raw_json,
    row.migrated_at,
  );
}

export function patientExists(id: string): boolean {
  const row = getDb()
    .prepare("SELECT 1 AS ok FROM patients WHERE id = ?")
    .get(id) as { ok: number } | undefined;

  return row !== undefined;
}

export function countPatients(): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS count FROM patients")
    .get() as { count: number };

  return row.count;
}

export function countObservations(): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS count FROM observations")
    .get() as { count: number };

  return row.count;
}

export function samplePatients(limit: number): PatientRow[] {
  return getDb()
    .prepare(
      "SELECT id, family, given, full_name, birth_date, gender FROM patients LIMIT ?",
    )
    .all(limit) as PatientRow[];
}

export function sampleObservations(limit: number): Array<
  Pick<
    ObservationRow,
    "id" | "patient_id" | "code" | "value" | "effective"
  >
> {
  return getDb()
    .prepare(
      "SELECT id, patient_id, code, value, effective FROM observations LIMIT ?",
    )
    .all(limit) as Array<
    Pick<ObservationRow, "id" | "patient_id" | "code" | "value" | "effective">
  >;
}
