// Thin client for the existing Express API (unchanged). All routes live under
// /api/skills and are proxied to :3000 by Vite in dev.
const BASE = '/api/skills';

export async function api(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new Error('Cannot reach the server. Make sure the API is running on port 3000.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}
