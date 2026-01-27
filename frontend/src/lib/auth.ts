import { apiPostForm } from "./api";

const TOKEN_KEY = "ai_os_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export async function login(username: string, password: string): Promise<string> {
  const res = await apiPostForm("/auth/login", { username, password });
  const token = res.access_token as string;
  setToken(token);
  return token;
}
