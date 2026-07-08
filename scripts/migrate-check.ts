import { closeDb, getDb } from "../src/db/connection.js";
import {
  countObservations,
  countPatients,
  patientExists,
  sampleObservations,
  samplePatients,
  upsertObservation,
  upsertPatient,
} from "../src/db/repositories.js";
import { fetchPages } from "../src/fhir/client.js";
import { parseObservation, parsePatient } from "../src/fhir/parser.js";

const maxPages = Number(process.argv[2] ?? 1);

let patientErrors = 0;
let observationErrors = 0;

getDb();

console.log(`Migrating ${maxPages} page(s) of Patient, then Observation...`);

for await (const bundle of fetchPages("Patient", { maxPages })) {
  for (const entry of bundle.entry ?? []) {
    if (!entry.resource) {
      continue;
    }

    try {
      upsertPatient(parsePatient(entry.resource));
    } catch (error) {
      patientErrors += 1;
      console.warn("Skipped patient:", (error as Error).message);
    }
  }
}

for await (const bundle of fetchPages("Observation", { maxPages })) {
  for (const entry of bundle.entry ?? []) {
    if (!entry.resource) {
      continue;
    }

    try {
      upsertObservation(
        parseObservation(entry.resource, { patientExists }),
      );
    } catch (error) {
      observationErrors += 1;
      console.warn("Skipped observation:", (error as Error).message);
    }
  }
}

console.log(`Patients saved: ${countPatients()} (${patientErrors} skipped)`);
console.log(
  `Observations saved: ${countObservations()} (${observationErrors} skipped)`,
);

console.log("\nSample patients:");
console.table(samplePatients(3));

console.log("Sample observations:");
console.table(sampleObservations(3));

closeDb();
