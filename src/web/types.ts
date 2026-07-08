export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
}

export interface PatientSummary {
  id: string;
  family: string | null;
  given: string | null;
  full_name: string | null;
  birth_date: string | null;
  gender: string | null;
  migrated_at: string;
}

export interface PatientDetail extends PatientSummary {
  fhir: Record<string, unknown>;
}

export interface ObservationSummary {
  id: string;
  subject_type: string | null;
  subject_id: string | null;
  patient_id: string | null;
  subject_display: string | null;
  status: string | null;
  code: string | null;
  effective: string | null;
  value: string | null;
  migrated_at: string;
}

export interface MigrationRun {
  id: number;
  started_at: string;
  finished_at: string | null;
  status: string;
  resource_type: string;
  fetched: number;
  saved: number;
  errors: number;
  last_page_url: string | null;
  error_message: string | null;
}

export interface MigrationStatus {
  counts: {
    patients: number;
    observations: number;
  };
  latestRuns: {
    Patient: MigrationRun | null;
    Observation: MigrationRun | null;
  };
}

export interface ListResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface DetailResponse<T> {
  data: T;
}
