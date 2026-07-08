import { closeDb } from "../src/db/connection.js";
import { runMigration } from "../src/migration/runner.js";
import type { FhirResourceType } from "../src/fhir/client.js";

const VALID_TYPES = ["Patient", "Observation"] as const;

function parseArgs(argv: string[]) {
  let limit: number | undefined;
  let resume = false;
  let only: FhirResourceType | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--limit") {
      limit = Number(argv[++i]);
      continue;
    }

    if (arg.startsWith("--limit=")) {
      limit = Number(arg.slice("--limit=".length));
      continue;
    }

    if (/^\d+$/.test(arg)) {
      limit = Number(arg);
      continue;
    }

    if (arg === "--resume") {
      resume = true;
      continue;
    }

    if (arg === "--only") {
      const value = argv[++i];
      if (!VALID_TYPES.includes(value as (typeof VALID_TYPES)[number])) {
        console.error(`Unknown resource type: "${value}". Use Patient or Observation.`);
        process.exit(1);
      }
      only = value as FhirResourceType;
    }
  }

  if (process.env.MIGRATE_LIMIT) {
    limit = Number(process.env.MIGRATE_LIMIT);
  }

  return { limit, resume, only };
}

const options = parseArgs(process.argv.slice(2));

try {
  await runMigration(options);
} finally {
  closeDb();
}
