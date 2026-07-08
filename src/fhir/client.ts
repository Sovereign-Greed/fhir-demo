import { config } from "../config.js";

export type FhirResourceType = "Patient" | "Observation";

export interface FhirBundle {
  resourceType: string;
  total?: number;
  link?: Array<{ relation: string; url: string }>;
  entry?: Array<{ resource?: Record<string, unknown> }>;
}

export function searchUrl(resourceType: FhirResourceType): string {
  return `${config.fhirBaseUrl}/${resourceType}?_count=${config.pageSize}`;
}

export async function* fetchPages(
  resourceType: FhirResourceType,
  options: { maxPages?: number; startUrl?: string } = {},
): AsyncGenerator<FhirBundle> {
  let url: string | undefined = options.startUrl ?? searchUrl(resourceType);
  let page = 0;

  while (url) {
    page += 1;
    if (options.maxPages !== undefined && page > options.maxPages) {
      return;
    }

    const bundle = await fetchBundle(url);
    yield bundle;

    url = getNextUrl(bundle);
    if (url) {
      await sleep(config.requestDelayMs);
    }
  }
}

async function fetchBundle(url: string): Promise<FhirBundle> {
  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/fhir+json" },
        signal: AbortSignal.timeout(config.requestTimeoutMs),
      });

      if (response.ok) {
        return (await response.json()) as FhirBundle;
      }

      if (attempt === config.maxRetries) {
        throw new Error(`FHIR request failed: ${response.status}`);
      }
    } catch (error) {
      if (attempt === config.maxRetries) {
        throw error;
      }
    }

    await sleep(1000 * attempt);
  }

  throw new Error("FHIR request failed");
}

function getNextUrl(bundle: FhirBundle): string | undefined {
  const next = bundle.link?.find((link) => link.relation === "next")?.url;
  if (!next) {
    return undefined;
  }

  return new URL(next, config.fhirBaseUrl).toString();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
