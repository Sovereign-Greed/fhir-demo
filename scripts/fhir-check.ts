import {
  fetchPages,
  searchUrl,
  type FhirResourceType,
} from "../src/fhir/client.js";

const VALID_TYPES = ["Patient", "Observation"] as const;

const input = process.argv[2] ?? "Patient";
if (!VALID_TYPES.includes(input as (typeof VALID_TYPES)[number])) {
  console.error(
    `Unknown resource type: "${input}". Use Patient or Observation.`,
  );
  process.exit(1);
}

const resourceType = input as FhirResourceType;
const maxPages = Number(process.argv[3] ?? 2);

let totalEntries = 0;
let pagesFetched = 0;

console.log(`Fetching ${resourceType}, max ${maxPages} page(s)...`);
console.log(`Start URL: ${searchUrl(resourceType)}`);

for await (const bundle of fetchPages(resourceType, { maxPages })) {
  pagesFetched += 1;
  const entries = bundle.entry?.length ?? 0;
  totalEntries += entries;

  const hasNext = bundle.link?.some((link) => link.relation === "next");
  console.log(
    `Page ${pagesFetched}: ${entries} entries` +
      (bundle.total !== undefined ? ` (bundle total: ${bundle.total})` : "") +
      (hasNext ? " [has next]" : " [done]"),
  );
}

console.log(
  `Fetched ${totalEntries} ${resourceType} resource(s) across ${pagesFetched} page(s).`,
);
