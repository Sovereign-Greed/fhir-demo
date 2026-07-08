import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPatients } from "../api-client";
import { Pagination } from "../components/Pagination";
import type { PatientSummary } from "../types";

const PAGE_SIZE = 20;

export function PatientsPage() {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const response = await getPatients({
          limit: PAGE_SIZE,
          offset,
          search: query || undefined,
        });

        if (active) {
          setPatients(response.data);
          setTotal(response.meta.total);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError((err as Error).message);
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
  }, [offset, query]);

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    setOffset(0);
    setQuery(search.trim());
  }

  return (
    <>
      <form className="toolbar" onSubmit={handleSearch}>
        <input
          type="search"
          placeholder="Search by name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button type="submit">Search</button>
        <button
          type="button"
          onClick={() => {
            setSearch("");
            setQuery("");
            setOffset(0);
          }}
        >
          Clear
        </button>
      </form>

      {error && (
        <p className="error">
          Failed to load patients: {error}. Is the API running? Start it with{" "}
          <code>npm run dev:api</code>.
        </p>
      )}
      {loading && <p className="muted">Loading patients...</p>}

      {!loading && !error && (
        <>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Birth date</th>
                <th>Gender</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr key={patient.id}>
                  <td>
                    <Link to={`/patients/${patient.id}`}>
                      {patient.full_name ?? "Unknown"}
                    </Link>
                  </td>
                  <td>{patient.birth_date ?? "-"}</td>
                  <td>{patient.gender ?? "-"}</td>
                  <td>{patient.id}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {patients.length === 0 && (
            <p className="muted">No patients found.</p>
          )}

          <Pagination
            total={total}
            limit={PAGE_SIZE}
            offset={offset}
            onChange={setOffset}
          />
        </>
      )}
    </>
  );
}
