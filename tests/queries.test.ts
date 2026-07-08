import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setupTestDb, teardownTestDb } from "./helpers/test-db.js";

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

before(async () => {
  await setupTestDb();
});

after(async () => {
  await teardownTestDb();
});

test("upsert and read patient", async () => {
  const { parsePatient, parseObservation } = await import(
    "../src/fhir/parser.js"
  );
  const { upsertPatient, upsertObservation } = await import(
    "../src/db/repositories.js"
  );
  const { getPatientById, listPatients } = await import(
    "../src/db/queries.js"
  );

  upsertPatient(parsePatient(patient));

  const stored = getPatientById("patient-1");
  assert.ok(stored);
  assert.equal(stored.full_name, "Carlos Ramirez");

  const list = listPatients({ limit: 10, offset: 0, search: "ramirez" });
  assert.equal(list.total, 1);
  assert.equal(list.rows[0]?.id, "patient-1");
});

test("observation links to patient when patient exists", async () => {
  const { parsePatient, parseObservation } = await import(
    "../src/fhir/parser.js"
  );
  const { upsertPatient, upsertObservation, patientExists } = await import(
    "../src/db/repositories.js"
  );
  const { listObservations } = await import("../src/db/queries.js");

  upsertPatient(parsePatient(patient));
  upsertObservation(
    parseObservation(observation, { patientExists }),
  );

  const linked = listObservations({
    limit: 10,
    offset: 0,
    patientId: "patient-1",
  });

  assert.equal(linked.total, 1);
  assert.equal(linked.rows[0]?.patient_id, "patient-1");
  assert.equal(linked.rows[0]?.code, "Hemoglobin");
});
