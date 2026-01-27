import React, { useEffect, useState } from "react";
import MainLayout from "../../layouts/MainLayout";
import { apiGet } from "../../lib/api";
import { getToken } from "../../lib/auth";

export default function Tools() {
  const [skills, setSkills] = useState<any[]>([]);
  const [plugins, setPlugins] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken() || undefined;
    Promise.all([apiGet("/ai/skills", token), apiGet("/ai/plugins", token)])
      .then(([skillsRes, pluginsRes]) => {
        setSkills(skillsRes);
        setPlugins(pluginsRes);
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <MainLayout>
      <h2>AI Tools</h2>
      {error && <p>Error: {error}</p>}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Skills</h3>
        <ul className="list">
          {skills.map((skill) => (
            <li key={skill.skill_id}>
              {skill.skill_id} <span className="badge">{String(skill.enabled)}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="card">
        <h3>Plugins</h3>
        <ul className="list">
          {plugins.map((plugin) => (
            <li key={plugin.plugin_id}>
              {plugin.plugin_id} <span className="badge">{String(plugin.enabled)}</span>
            </li>
          ))}
        </ul>
      </div>
    </MainLayout>
  );
}
