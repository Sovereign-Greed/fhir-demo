import type {
  DetailResponse,
  ListResponse,
  MigrationStatus,
  ObservationSummary,
  PatientDetail,
  PatientSummary,
} from "./types";

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export function getMigrationStatus() {
  return getJson<{ data: MigrationStatus }>("/api/migration/status");
}

export function getPatients(params: {
  limit: number;
  offset: number;
  search?: string;
}) {
  const query = new URLSearchParams({
    limit: String(params.limit),
    offset: String(params.offset),
  });

  if (params.search) {
    query.set("search", params.search);
  }

  return getJson<ListResponse<PatientSummary>>(`/api/patients?${query}`);
}

export function getPatient(id: string) {
  return getJson<DetailResponse<PatientDetail>>(`/api/patients/${id}`);
}

export function getPatientObservations(
  patientId: string,
  params: { limit: number; offset: number },
) {
  const query = new URLSearchParams({
    limit: String(params.limit),
    offset: String(params.offset),
  });

  return getJson<ListResponse<ObservationSummary>>(
    `/api/patients/${patientId}/observations?${query}`,
  );
}
