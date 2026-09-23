import { useEffect, useState } from "react";
import { apiFetch } from "../auth";

function StatusBadge({ status }) {
  const cls = status === "Success" ? "success" : status === "Warning" ? "warning" : "danger";
  return <span className={`badge ${cls}`}>{status}</span>;
}

export default function EJMainview() {
  const [records, setRecords] = useState([]);

  useEffect(() => {
    apiFetch("/ej").then((data) => setRecords(data || []));
  }, []);

  return (
    <>
      <div className="page-header">
        <h1>Electronic Journal — Mainview</h1>
        <p>Terminal task history synced from TMS-connected ATMs</p>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Terminal ID</th>
              <th>Task Name</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Status</th>
              <th>File Path</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td>{r.terminal_id}</td>
                <td>{r.task_name}</td>
                <td>{r.start_date}</td>
                <td>{r.end_date || "—"}</td>
                <td><StatusBadge status={r.status} /></td>
                <td style={{ fontFamily: "monospace", fontSize: 12 }}>{r.file_path}</td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr><td colSpan={6} style={{ color: "var(--text-muted)" }}>No records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
