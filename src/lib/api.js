import { useAuth } from '@clerk/react';
import { useMemo } from 'react';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

/**
 * useApi() — authenticated fetch helper.
 *
 * The returned object is memoised: it only changes identity when Clerk's
 * getToken changes (sign-in / sign-out). That matters because pages put `api`
 * in useCallback/useEffect dependency lists — an unstable object here would
 * re-trigger every fetch on every render.
 */
export function useApi() {
  const { getToken } = useAuth();

  return useMemo(() => {
    const authHeader = async () => {
      const token = await getToken({ template: 'invmatics' });
      return { Authorization: `Bearer ${token}` };
    };

    const request = async (method, path, body = null) => {
      const headers = {
        'Content-Type': 'application/json',
        ...(await authHeader()),
      };

      const options = { method, headers };
      if (body) options.body = JSON.stringify(body);

      const res = await fetch(`${BASE_URL}${path}`, options);

      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: res.statusText }));
        const detail = Array.isArray(error.detail)
          ? error.detail.map(d => d.msg).join('; ')   // FastAPI validation errors
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

      // PDF download — returns a blob URL you can open in a new tab
      pdf: async (path) => {
        const res = await fetch(`${BASE_URL}${path}`, { headers: await authHeader() });
        if (!res.ok) throw new Error(`PDF request failed: ${res.status}`);
        const blob = await res.blob();
        return URL.createObjectURL(blob);
      },
    };
  }, [getToken]);
}
