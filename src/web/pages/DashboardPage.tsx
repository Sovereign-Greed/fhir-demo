import { useEffect, useState } from "react";
import { getMigrationStatus } from "../api-client";
import type { MigrationStatus } from "../types";

const REFRESH_MS = 10_000;

export function DashboardPage() {
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await getMigrationStatus();
        if (active) {
          setStatus(response.data);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError((err as Error).message);
        }
      }
    }

    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  if (error) {
    return (
      <p className="error">
        Failed to load status: {error}. Is the API running? Start it with{" "}
        <code>npm run dev:api</code>.
      </p>
    );
  }

  if (!status) {
    return <p className="muted">Loading migration status...</p>;
  }

  return (
    <>
      <section className="card">
        <h2>Migrated data</h2>
        <div className="stats">
          <div className="stat">
            <span className="muted">Patients</span>
            <strong>{status.counts.patients.toLocaleString()}</strong>
          </div>
          <div className="stat">
            <span className="muted">Observations</span>
            <strong>{status.counts.observations.toLocaleString()}</strong>
          </div>
        </div>
        <p className="muted">Status refreshes every 10 seconds.</p>
      </section>

      <section className="card">
        <h2>Latest migration runs</h2>
        <RunSummary label="Patient" run={status.latestRuns.Patient} />
        <RunSummary label="Observation" run={status.latestRuns.Observation} />
      </section>
    </>
  );
}

function RunSummary({
  label,
  run,
}: {
  label: string;
  run: MigrationStatus["latestRuns"]["Patient"];
}) {
  if (!run) {
    return <p className="muted">No {label} migration run yet.</p>;
  }

  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <strong>{label}</strong>
      <div className="muted">
        {run.status} | saved {run.saved.toLocaleString()} | errors{" "}
        {run.errors.toLocaleString()}
        {run.finished_at ? ` | finished ${run.finished_at}` : ""}
      </div>
    </div>
  );
}
