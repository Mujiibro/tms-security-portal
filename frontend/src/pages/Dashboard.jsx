import { useEffect, useState } from "react";
import { apiFetch } from "../auth";

export default function Dashboard() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    apiFetch("/anomaly/summary").then(setSummary);
  }, []);

  return (
    <>
      <div className="page-header">
        <h1>Overview</h1>
        <p>TMS platform status and security posture at a glance</p>
      </div>

      <div className="stat-row">
        <div className="stat-card">
          <div className="label">Total Login Events</div>
          <div className="value">{summary?.total_events ?? "–"}</div>
        </div>
        <div className="stat-card">
          <div className="label">Flagged Anomalies</div>
          <div className="value" style={{ color: "#c98a13" }}>
            {summary?.flagged_anomalies ?? "–"}
          </div>
        </div>
        <div className="stat-card">
          <div className="label">Failed Logins</div>
          <div className="value" style={{ color: "#d43f3f" }}>
            {summary?.failed_logins ?? "–"}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>System Architecture</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6 }}>
          React/Vite frontend → Node/Express API → SQLite (local) → Python ML
          microservice (Isolation Forest) scores every login event for
          anomalies → flagged events are written to <code>tms_security.log</code>
          → picked up by the Wazuh agent → matched against local_rules.xml →
          surfaced on the Wazuh dashboard and this console.
        </p>
      </div>
    </>
  );
}
