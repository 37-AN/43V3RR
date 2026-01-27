import React, { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import { apiGet } from "../lib/api";
import { getToken } from "../lib/auth";

export default function Home() {
  const [logs, setLogs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken() || undefined;
    apiGet("/logs", token)
      .then(setLogs)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <MainLayout>
      <h2>Overview</h2>
      {error && <p>Error: {error}</p>}
      <div className="card">
        <h3>Recent Logs</h3>
        <ul className="list">
          {logs.slice(0, 10).map((log) => (
            <li key={log.id}>
              {log.action} <span className="badge">{log.entity_type}</span>
            </li>
          ))}
        </ul>
      </div>
    </MainLayout>
  );
}
