import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseObservation, parsePatient } from "../src/fhir/parser.js";

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures",
);

const patient = JSON.parse(
  readFileSync(path.join(fixturesDir, "patient.json"), "utf8"),
) as Record<string, unknown>;

const observation = JSON.parse(
  readFileSync(path.join(fixturesDir, "observation.json"), "utf8"),
) as Record<string, unknown>;

test("parsePatient extracts flat fields", () => {
  const row = parsePatient(patient);

  assert.equal(row.id, "patient-1");
  assert.equal(row.family, "Ramirez");
  assert.equal(row.given, "Carlos");
  assert.equal(row.full_name, "Carlos Ramirez");
  assert.equal(row.birth_date, "1974-05-12");
  assert.equal(row.gender, "male");
  assert.ok(row.raw_json.includes("Ramirez"));
});

test("parseObservation extracts subject and value fields", () => {
  const row = parseObservation(observation, {
    patientExists: (id) => id === "patient-1",
  });

  assert.equal(row.id, "obs-1");
  assert.equal(row.subject_type, "Patient");
  assert.equal(row.subject_id, "patient-1");
  assert.equal(row.patient_id, "patient-1");
  assert.equal(row.subject_display, "Carlos Ramirez");
  assert.equal(row.code, "Hemoglobin");
  assert.equal(row.effective, "2025-04-20T08:00:00Z");
  assert.equal(row.value, "14.5 g/dL");
});

test("parseObservation leaves patient_id null when patient not loaded", () => {
  const row = parseObservation(observation);

  assert.equal(row.subject_type, "Patient");
  assert.equal(row.subject_id, "patient-1");
  assert.equal(row.patient_id, null);
});

test("parsePatient rejects wrong resource type", () => {
  assert.throws(
    () => parsePatient({ ...patient, resourceType: "Observation" }),
    /Expected Patient/,
  );
});
