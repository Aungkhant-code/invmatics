import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@clerk/react';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * useApi() — authenticated fetch helper.
 *
 * The returned object has a FIXED identity. Pages list `api` in their
 * useEffect/useCallback dependencies, so a new object on every render
 * re-runs every fetch in an endless loop. The latest getToken is read
 * through a ref, so the object never needs to change.
 */
export function useApi() {
  const { getToken } = useAuth();

  const getTokenRef = useRef(getToken);
  useEffect(() => { getTokenRef.current = getToken; }, [getToken]);

  return useMemo(() => {
    const authHeader = async () => {
      const token = await getTokenRef.current({ template: 'invmatics' });
      return { Authorization: `Bearer ${token}` };
    };

    const request = async (method, path, body = null) => {
      const options = {
        method,
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      };
      if (body) options.body = JSON.stringify(body);

      const res = await fetch(`${BASE_URL}${path}`, options);

      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: res.statusText }));
        const detail = Array.isArray(error.detail)
          ? error.detail.map(d => d.msg).join('; ')
          : error.detail;
        throw new Error(detail || `Request failed: ${res.status}`);
      }

      if (res.status === 204) return null;
      return res.json();
    };

    return {
      get:    (path)       => request('GET',    path),
      post:   (path, body) => request('POST',   path, body),
      put:    (path, body) => request('PUT',    path, body),
      delete: (path)       => request('DELETE', path),
      pdf: async (path) => {
        const res = await fetch(`${BASE_URL}${path}`, { headers: await authHeader() });
        if (!res.ok) throw new Error(`PDF request failed: ${res.status}`);
        return URL.createObjectURL(await res.blob());
      },
    };
  }, []);
}