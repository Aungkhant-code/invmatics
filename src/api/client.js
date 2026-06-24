const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res;
}

export const get     = (path)        => request(path).then(r => r.json());
export const post    = (path, body)  => request(path, { method: 'POST',   body: JSON.stringify(body) }).then(r => r.json());
export const put     = (path, body)  => request(path, { method: 'PUT',    body: JSON.stringify(body) }).then(r => r.json());
export const del     = (path)        => request(path, { method: 'DELETE' }).then(r => r.json());
export const getBlob = (path)        => request(path).then(r => r.blob());
