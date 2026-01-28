import React, { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import { apiGet, apiPost } from "../lib/api";
import { getToken } from "../lib/auth";

export default function Observability() {
  const [summary, setSummary] = useState<any | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [brands, setBrands] = useState<any | null>(null);

  useEffect(() => {
    const token = getToken() || undefined;
    apiGet("/system/observability_summary", token).then(setSummary).catch(() => null);
    apiGet("/system/brand_summary", token).then(setBrands).catch(() => null);
  }, []);

  async function syncWorkflows() {
    const token = getToken() || undefined;
    const res = await apiPost("/system/sync_n8n_workflows", {}, token);
    setMessage(`Synced: ${res.created} created, ${res.updated} updated`);
  }

  return (
    <MainLayout>
      <h2>Observability</h2>
      <div className="card" style={{ marginBottom: 16 }}>
        <button className="button" onClick={syncWorkflows}>
          Sync n8n workflows
        </button>
        <a className="button" style={{ marginLeft: 12 }} href="http://localhost:3001" target="_blank" rel="noreferrer">
          Open Grafana
        </a>
        {message && <p>{message}</p>}
      </div>
      {summary && (
        <div className="card">
          <h3>Last 24h</h3>
          <p>Since: {summary.since}</p>
          <h4>AI Runs</h4>
          <ul className="list">
            {Object.entries(summary.ai_runs || {}).map(([agent, counts]: any) => (
              <li key={agent}>
                {agent}: {counts.success} success / {counts.failure} failure
              </li>
            ))}
          </ul>
          <h4>Workflow Runs</h4>
          <ul className="list">
            {Object.entries(summary.workflows || {}).map(([workflow, count]: any) => (
              <li key={workflow}>
                {workflow}: {count}
              </li>
            ))}
          </ul>
        </div>
      )}
      {brands && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Brand Summary</h3>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(brands, null, 2)}</pre>
        </div>
      )}
    </MainLayout>
  );
}
