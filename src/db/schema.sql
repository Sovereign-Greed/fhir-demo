CREATE TABLE IF NOT EXISTS migration_runs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at    TEXT NOT NULL,
  finished_at   TEXT,
  status        TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  fetched       INTEGER DEFAULT 0,
  saved         INTEGER DEFAULT 0,
  errors        INTEGER DEFAULT 0,
  last_page_url TEXT,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS patients (
  id          TEXT PRIMARY KEY,
  family      TEXT,
  given       TEXT,
  full_name   TEXT,
  birth_date  TEXT,
  gender      TEXT,
  raw_json    TEXT NOT NULL,
  migrated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS observations (
  id               TEXT PRIMARY KEY,
  subject_type     TEXT,
  subject_id       TEXT,
  patient_id       TEXT,
  subject_display  TEXT,
  status           TEXT,
  code             TEXT,
  effective        TEXT,
  value            TEXT,
  raw_json         TEXT NOT NULL,
  migrated_at      TEXT NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE INDEX IF NOT EXISTS idx_observations_patient_id ON observations(patient_id);
CREATE INDEX IF NOT EXISTS idx_observations_subject ON observations(subject_type, subject_id);
