import React, { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import { apiGet, apiPost } from "../lib/api";
import { getToken } from "../lib/auth";

export default function AI() {
  const [runs, setRuns] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken() || undefined;
    apiGet("/ai/runs", token).then(setRuns).catch(() => null);
  }, []);

  async function triggerDailySummary() {
    const token = getToken() || undefined;
    const res = await apiPost("/ai/daily-summary", {}, token);
    setMessage(res.note || "Triggered");
  }

  return (
    <MainLayout>
      <h2>AI Runs</h2>
      <button onClick={triggerDailySummary}>Run Daily Summary</button>
      {message && <p>{message}</p>}
      <ul>
        {runs.map((run) => (
          <li key={run.id}>{run.agent_name} - {String(run.success)}</li>
        ))}
      </ul>
    </MainLayout>
  );
}
