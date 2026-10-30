import { useAuth } from '@clerk/react';
import { useCallback } from 'react';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export function useApi() {
  const { getToken } = useAuth();

  const request = useCallback(async (method, path, body = null) => {
    const token = await getToken({ template: 'invmatics' });

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${BASE_URL}${path}`, options);

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.detail || `Request failed: ${res.status}`);
    }

    if (res.status === 204) return null;

    return res.json();
  }, [getToken]);

  return {
    get:    (path)         => request('GET',    path),
    post:   (path, body)   => request('POST',   path, body),
    put:    (path, body)   => request('PUT',    path, body),
    delete: (path)         => request('DELETE', path),

    pdf: async (path) => {
      const token = await getToken({ template: 'invmatics' });
      const res = await fetch(`${BASE_URL}${path}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`PDF request failed: ${res.status}`);
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    },
  };
}
