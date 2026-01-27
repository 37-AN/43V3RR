import React, { useEffect, useState } from "react";
import { getToken, login } from "../lib/auth";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setToken(getToken());
  }, []);

  async function handleLogin() {
    try {
      const newToken = await login("admin", "admin");
      setToken(newToken);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="layout">
      <header className="header">
        <div>
          <h1>43v3r AI OS</h1>
          <span className="badge">Local-first</span>
        </div>
        <div>
          <button className="button" onClick={handleLogin}>
            Login as admin
          </button>
          {token && <span style={{ marginLeft: 12 }}>Authenticated</span>}
          {error && <span style={{ marginLeft: 12 }}>Error: {error}</span>}
        </div>
        <nav className="nav">
          <a href="/">Home</a>
          <a href="/tasks">Tasks</a>
          <a href="/ideas">Ideas</a>
          <a href="/logs">Logs</a>
          <a href="/ai">AI</a>
          <a href="/ai/tools">AI Tools</a>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
