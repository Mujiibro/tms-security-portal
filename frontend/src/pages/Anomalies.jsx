import { useEffect, useState } from "react";
import { apiFetch } from "../auth";

export default function Anomalies() {
  const [events, setEvents] = useState([]);
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(true);

  useEffect(() => {
    const path = showFlaggedOnly ? "/anomaly/flagged" : "/anomaly/events";
    apiFetch(path).then((data) => setEvents(data || []));
  }, [showFlaggedOnly]);

  return (
    <>
      <div className="page-header">
        <h1>Security Anomalies</h1>
        <p>Login events scored by the ML anomaly-detection microservice (Isolation Forest)</p>
      </div>

      <div className="card">
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, color: "var(--text-muted)" }}>
            <input
              type="checkbox"
              checked={showFlaggedOnly}
              onChange={(e) => setShowFlaggedOnly(e.target.checked)}
              style={{ marginRight: 6 }}
            />
            Show flagged anomalies only
          </label>
        </div>

        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Username</th>
              <th>IP Address</th>
              <th>Result</th>
              <th>Hour</th>
              <th>Anomaly Score</th>
              <th>Flagged</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td>{e.created_at}</td>
                <td>{e.username}</td>
                <td style={{ fontFamily: "monospace" }}>{e.ip_address}</td>
                <td>
                  <span className={`badge ${e.success ? "success" : "danger"}`}>
                    {e.success ? "Success" : "Failed"}
                  </span>
                </td>
                <td>{e.hour_of_day}:00</td>
                <td>{e.anomaly_score != null ? Number(e.anomaly_score).toFixed(3) : "—"}</td>
                <td>
                  {e.is_anomaly ? (
                    <span className="badge warning">Flagged</span>
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>—</span>
                  )}
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr><td colSpan={7} style={{ color: "var(--text-muted)" }}>No events yet. Try logging in/out a few times.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
