const BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";
export async function api(path, options = {}) {
  const response = await fetch(BASE + path, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || "Request failed");
  return data;
}
export const post = (path, body) => api(path, { method: "POST", body: JSON.stringify(body) });
