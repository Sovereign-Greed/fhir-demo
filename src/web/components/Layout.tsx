import { NavLink, Outlet } from "react-router-dom";

export function Layout() {
  return (
    <div className="layout">
      <header>
        <h1>FHIR Migration Demo</h1>
        <nav>
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/patients">Patients</NavLink>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
