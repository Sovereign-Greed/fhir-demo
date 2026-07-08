import { getDb } from "./connection.js";
import { countObservations, countPatients } from "./repositories.js";
import { getLatestRun } from "../migration/runs.js";

export interface ListPatientsOptions {
  limit: number;
  offset: number;
  search?: string;
}

export interface ListObservationsOptions {
  limit: number;
  offset: number;
  patientId?: string;
}

export function listPatients(options: ListPatientsOptions) {
  const search = options.search?.trim();
  const pattern = search ? `%${search}%` : null;

  const rows = getDb()
    .prepare(
      `SELECT id, family, given, full_name, birth_date, gender, migrated_at
       FROM patients
       WHERE (? IS NULL OR full_name LIKE ? OR family LIKE ? OR given LIKE ?)
       ORDER BY full_name, id
       LIMIT ? OFFSET ?`,
    )
    .all(pattern, pattern, pattern, pattern, options.limit, options.offset);

  const total = (
    getDb()
      .prepare(
        `SELECT COUNT(*) AS count
         FROM patients
         WHERE (? IS NULL OR full_name LIKE ? OR family LIKE ? OR given LIKE ?)`,
      )
      .get(pattern, pattern, pattern, pattern) as { count: number }
  ).count;

  return { rows, total };
}

export function getPatientById(id: string) {
  return getDb()
    .prepare(
      `SELECT id, family, given, full_name, birth_date, gender, raw_json, migrated_at
       FROM patients
       WHERE id = ?`,
    )
    .get(id) as
    | {
        id: string;
        family: string | null;
        given: string | null;
        full_name: string | null;
        birth_date: string | null;
        gender: string | null;
        raw_json: string;
        migrated_at: string;
      }
    | undefined;
}

export function listObservations(options: ListObservationsOptions) {
  const rows = getDb()
    .prepare(
      `SELECT id, subject_type, subject_id, patient_id, subject_display,
              status, code, effective, value, migrated_at
       FROM observations
       WHERE (? IS NULL OR patient_id = ?)
       ORDER BY effective DESC, id
       LIMIT ? OFFSET ?`,
    )
    .all(
      options.patientId ?? null,
      options.patientId ?? null,
      options.limit,
      options.offset,
    );

  const total = (
    getDb()
      .prepare(
        `SELECT COUNT(*) AS count
         FROM observations
         WHERE (? IS NULL OR patient_id = ?)`,
      )
      .get(options.patientId ?? null, options.patientId ?? null) as {
      count: number;
    }
  ).count;

  return { rows, total };
}

export function getObservationById(id: string) {
  return getDb()
    .prepare(
      `SELECT id, subject_type, subject_id, patient_id, subject_display,
              status, code, effective, value, raw_json, migrated_at
       FROM observations
       WHERE id = ?`,
    )
    .get(id) as
    | {
        id: string;
        subject_type: string | null;
        subject_id: string | null;
        patient_id: string | null;
        subject_display: string | null;
        status: string | null;
        code: string | null;
        effective: string | null;
        value: string | null;
        raw_json: string;
        migrated_at: string;
      }
    | undefined;
}

export function getMigrationStatus() {
  return {
    counts: {
      patients: countPatients(),
      observations: countObservations(),
    },
    latestRuns: {
      Patient: getLatestRun("Patient") ?? null,
      Observation: getLatestRun("Observation") ?? null,
    },
  };
}
