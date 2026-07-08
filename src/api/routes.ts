import { Router } from "express";
import {
  getMigrationStatus,
  getObservationById,
  getPatientById,
  listObservations,
  listPatients,
} from "../db/queries.js";

export const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.get("/migration/status", (_req, res) => {
  res.json({ data: getMigrationStatus() });
});

router.get("/patients", (req, res) => {
  const { limit, offset } = parsePagination(req.query);
  const search =
    typeof req.query.search === "string" ? req.query.search : undefined;
  const result = listPatients({ limit, offset, search });

  res.json({
    data: result.rows,
    meta: { total: result.total, limit, offset },
  });
});

router.get("/patients/:id", (req, res) => {
  const patient = getPatientById(req.params.id);
  if (!patient) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  res.json({ data: formatPatient(patient) });
});

router.get("/patients/:id/observations", (req, res) => {
  const patient = getPatientById(req.params.id);
  if (!patient) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  const { limit, offset } = parsePagination(req.query);
  const result = listObservations({
    limit,
    offset,
    patientId: req.params.id,
  });

  res.json({
    data: result.rows,
    meta: { total: result.total, limit, offset },
  });
});

router.get("/observations", (req, res) => {
  const { limit, offset } = parsePagination(req.query);
  const patientId =
    typeof req.query.patientId === "string" ? req.query.patientId : undefined;
  const result = listObservations({ limit, offset, patientId });

  res.json({
    data: result.rows,
    meta: { total: result.total, limit, offset },
  });
});

router.get("/observations/:id", (req, res) => {
  const observation = getObservationById(req.params.id);
  if (!observation) {
    res.status(404).json({ error: "Observation not found" });
    return;
  }

  res.json({ data: formatObservation(observation) });
});

function parsePagination(query: Record<string, unknown>) {
  const limit = Math.min(Math.max(Number(query.limit ?? 50), 1), 100);
  const offset = Math.max(Number(query.offset ?? 0), 0);
  return { limit, offset };
}

function formatPatient(patient: {
  id: string;
  family: string | null;
  given: string | null;
  full_name: string | null;
  birth_date: string | null;
  gender: string | null;
  raw_json: string;
  migrated_at: string;
}) {
  const { raw_json, ...fields } = patient;
  return {
    ...fields,
    fhir: JSON.parse(raw_json) as unknown,
  };
}

function formatObservation(observation: {
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
}) {
  const { raw_json, ...fields } = observation;
  return {
    ...fields,
    fhir: JSON.parse(raw_json) as unknown,
  };
}
