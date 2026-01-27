import React, { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import { apiGet, apiPost } from "../lib/api";
import { getToken } from "../lib/auth";

export default function Ideas() {
  const [ideas, setIdeas] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken() || undefined;
    apiGet("/ideas", token)
      .then(setIdeas)
      .catch((err) => setError(err.message));
  }, []);

  async function createIdea() {
    try {
      const token = getToken() || undefined;
      const created = await apiPost(
        "/ideas",
        { content: "Draft new release plan", source: "manual" },
        token
      );
      setIdeas([created, ...ideas]);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <MainLayout>
      <h2>Ideas</h2>
      {error && <p>Error: {error}</p>}
      <button className="button" onClick={createIdea}>
        Create Sample Idea
      </button>
      <div className="card" style={{ marginTop: 16 }}>
        <ul className="list">
          {ideas.map((idea) => (
            <li key={idea.id}>{idea.content}</li>
          ))}
        </ul>
      </div>
    </MainLayout>
  );
}
