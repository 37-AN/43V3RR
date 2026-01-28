import React, { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import { apiGet, apiPost } from "../lib/api";
import { getToken } from "../lib/auth";

export default function Tasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken() || undefined;
    apiGet("/tasks/", token)
      .then(setTasks)
      .catch((err) => setError(err.message));
  }, []);

  async function createTask() {
    try {
      const token = getToken() || undefined;
      const created = await apiPost(
        "/tasks/",
        {
          brand_id: 1,
          title: "Sample Task",
          status: "open",
          priority: "medium",
          source: "manual",
          created_by: "human",
          assigned_to: "human",
        },
        token
      );
      setTasks([created, ...tasks]);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <MainLayout>
      <h2>Tasks</h2>
      {error && <p>Error: {error}</p>}
      <button className="button" onClick={createTask}>
        Create Sample Task
      </button>
      <div className="card" style={{ marginTop: 16 }}>
        <ul className="list">
          {tasks.map((task) => (
            <li key={task.id}>
              {task.title} <span className="badge">{task.status}</span>
            </li>
          ))}
        </ul>
      </div>
    </MainLayout>
  );
}
