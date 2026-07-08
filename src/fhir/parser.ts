export interface PatientRow {
  id: string;
  family: string | null;
  given: string | null;
  full_name: string | null;
  birth_date: string | null;
  gender: string | null;
  raw_json: string;
  migrated_at: string;
}

export interface ObservationRow {
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
}

export function parsePatient(resource: Record<string, unknown>): PatientRow {
  const id = requireId(resource, "Patient");

  const name = first(resource.name) as
    | { family?: string; given?: string[] }
    | undefined;

  const family = name?.family ?? null;
  const given = name?.given?.join(" ") ?? null;
  const fullName = [given, family].filter(Boolean).join(" ") || null;

  return {
    id,
    family,
    given,
    full_name: fullName,
    birth_date: stringOrNull(resource.birthDate),
    gender: stringOrNull(resource.gender),
    raw_json: JSON.stringify(resource),
    migrated_at: new Date().toISOString(),
  };
}

export function parseObservation(
  resource: Record<string, unknown>,
  options: { patientExists?: (id: string) => boolean } = {},
): ObservationRow {
  const id = requireId(resource, "Observation");
  const subject = resource.subject as
    | { reference?: string; display?: string }
    | undefined;

  const { type: subject_type, id: subject_id } = parseReference(
    subject?.reference,
  );

  let patient_id: string | null = null;
  if (subject_type === "Patient" && subject_id) {
    const exists = options.patientExists?.(subject_id) ?? false;
    patient_id = exists ? subject_id : null;
  }

  return {
    id,
    subject_type,
    subject_id,
    patient_id,
    subject_display: subject?.display ?? null,
    status: stringOrNull(resource.status),
    code: extractCode(resource.code),
    effective: extractEffective(resource),
    value: extractValue(resource),
    raw_json: JSON.stringify(resource),
    migrated_at: new Date().toISOString(),
  };
}

function requireId(resource: Record<string, unknown>, type: string): string {
  if (resource.resourceType !== type) {
    throw new Error(`Expected ${type}, got ${resource.resourceType}`);
  }

  if (typeof resource.id !== "string" || !resource.id) {
    throw new Error(`${type} missing id`);
  }

  return resource.id;
}

function parseReference(reference?: string): {
  type: string | null;
  id: string | null;
} {
  if (!reference) {
    return { type: null, id: null };
  }

  const parts = reference.split("/").filter(Boolean);
  if (parts.length < 2) {
    return { type: null, id: null };
  }

  return {
    type: parts[parts.length - 2] ?? null,
    id: parts[parts.length - 1] ?? null,
  };
}

function extractCode(code: unknown): string | null {
  if (!code || typeof code !== "object") {
    return null;
  }

  const concept = code as {
    text?: string;
    coding?: Array<{ display?: string }>;
  };

  return concept.coding?.[0]?.display ?? concept.text ?? null;
}

function extractEffective(resource: Record<string, unknown>): string | null {
  if (typeof resource.effectiveDateTime === "string") {
    return resource.effectiveDateTime;
  }

  const period = resource.effectivePeriod as { start?: string } | undefined;
  return period?.start ?? null;
}

function extractValue(resource: Record<string, unknown>): string | null {
  if (resource.valueQuantity && typeof resource.valueQuantity === "object") {
    const quantity = resource.valueQuantity as { value?: number; unit?: string };
    if (quantity.value !== undefined) {
      return quantity.unit
        ? `${quantity.value} ${quantity.unit}`
        : String(quantity.value);
    }
  }

  if (typeof resource.valueString === "string") {
    return resource.valueString;
  }

  if (resource.valueCodeableConcept) {
    return extractCode(resource.valueCodeableConcept);
  }

  if (typeof resource.valueBoolean === "boolean") {
    return String(resource.valueBoolean);
  }

  if (typeof resource.valueInteger === "number") {
    return String(resource.valueInteger);
  }

  return null;
}

function first<T>(value: unknown): T | undefined {
  return Array.isArray(value) ? (value[0] as T) : undefined;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
