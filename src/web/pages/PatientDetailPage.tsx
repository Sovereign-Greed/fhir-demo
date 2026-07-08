import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPatient, getPatientObservations } from "../api-client";
import { Pagination } from "../components/Pagination";
import type { ObservationSummary, PatientDetail } from "../types";

const PAGE_SIZE = 10;

export function PatientDetailPage() {
  const { id } = useParams();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [observations, setObservations] = useState<ObservationSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      return;
    }

    const patientId = id;
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const [patientResponse, observationResponse] = await Promise.all([
          getPatient(patientId),
          getPatientObservations(patientId, { limit: PAGE_SIZE, offset }),
        ]);

        if (active) {
          setPatient(patientResponse.data);
          setObservations(observationResponse.data);
          setTotal(observationResponse.meta.total);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError((err as Error).message);
          setPatient(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [id, offset]);

  if (!id) {
    return <p className="error">Missing patient id.</p>;
  }

  if (loading) {
    return <p className="muted">Loading patient...</p>;
  }

  if (error || !patient) {
    return (
      <>
        <p className="error">Failed to load patient: {error ?? "Not found"}</p>
        <Link to="/patients">Back to patients</Link>
      </>
    );
  }

  return (
    <>
      <p>
        <Link to="/patients">Back to patients</Link>
      </p>

      <section className="card">
        <h2>{patient.full_name ?? "Unknown patient"}</h2>
        <dl className="detail-grid">
          <dt>ID</dt>
          <dd>{patient.id}</dd>
          <dt>Birth date</dt>
          <dd>{patient.birth_date ?? "-"}</dd>
          <dt>Gender</dt>
          <dd>{patient.gender ?? "-"}</dd>
          <dt>Migrated at</dt>
          <dd>{patient.migrated_at}</dd>
        </dl>
      </section>

      <section className="card">
        <h2>Observations</h2>
        {observations.length === 0 ? (
          <p className="muted">No linked observations for this patient.</p>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Value</th>
                  <th>Effective</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {observations.map((observation) => (
                  <tr key={observation.id}>
                    <td>{observation.code ?? "-"}</td>
                    <td>{observation.value ?? "-"}</td>
                    <td>{observation.effective ?? "-"}</td>
                    <td>{observation.status ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Pagination
              total={total}
              limit={PAGE_SIZE}
              offset={offset}
              onChange={setOffset}
            />
          </>
        )}
      </section>
    </>
  );
}
