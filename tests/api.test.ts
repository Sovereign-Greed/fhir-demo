import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import request from "supertest";
import { createApp } from "../src/api/app.js";
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

const app = createApp();

before(async () => {
  await setupTestDb();

  const { parsePatient, parseObservation } = await import(
    "../src/fhir/parser.js"
  );
  const { upsertPatient, upsertObservation, patientExists } = await import(
    "../src/db/repositories.js"
  );

  upsertPatient(parsePatient(patient));
  upsertObservation(parseObservation(observation, { patientExists }));
});

after(async () => {
  await teardownTestDb();
});

test("GET /api/health", async () => {
  const res = await request(app).get("/api/health");
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { status: "ok" });
});

test("GET /api/patients returns paginated list", async () => {
  const res = await request(app).get("/api/patients?limit=10&search=ramirez");
  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 1);
  assert.equal(res.body.meta.total, 1);
  assert.equal(res.body.data[0].full_name, "Carlos Ramirez");
});

test("GET /api/patients/:id returns patient with fhir payload", async () => {
  const res = await request(app).get("/api/patients/patient-1");
  assert.equal(res.status, 200);
  assert.equal(res.body.data.id, "patient-1");
  assert.equal(res.body.data.fhir.resourceType, "Patient");
});

test("GET /api/patients/:id returns 404 for missing patient", async () => {
  const res = await request(app).get("/api/patients/missing");
  assert.equal(res.status, 404);
});

test("GET /api/patients/:id/observations returns linked rows", async () => {
  const res = await request(app).get("/api/patients/patient-1/observations");
  assert.equal(res.status, 200);
  assert.equal(res.body.meta.total, 1);
  assert.equal(res.body.data[0].code, "Hemoglobin");
});

test("GET /api/migration/status returns counts", async () => {
  const res = await request(app).get("/api/migration/status");
  assert.equal(res.status, 200);
  assert.equal(res.body.data.counts.patients, 1);
  assert.equal(res.body.data.counts.observations, 1);
});
