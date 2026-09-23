import { NavLink, useNavigate } from "react-router-dom";
import { clearToken } from "../auth";

export default function Sidebar() {
  const navigate = useNavigate();

  function handleSignOut() {
    clearToken();
    navigate("/login");
  }

  return (
    <aside className="sidebar">
      <div className="brand">TMS Console</div>
      <nav>
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
          Dashboard
        </NavLink>
        <NavLink to="/ej-mainview" className={({ isActive }) => (isActive ? "active" : "")}>
          EJ Mainview
        </NavLink>
        <NavLink to="/anomalies" className={({ isActive }) => (isActive ? "active" : "")}>
          Security Anomalies
        </NavLink>
      </nav>
      <div className="signout" onClick={handleSignOut}>
        Sign Out
      </div>
    </aside>
  );
}
