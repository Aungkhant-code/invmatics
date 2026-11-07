// Stale-while-revalidate cache for page data, kept in sessionStorage.
// Keys are scoped by Clerk user id so one user never sees another's data.
const PREFIX = 'im:v1:';

const k = (userId, key) => `${PREFIX}${userId}:${key}`;

export function readCache(userId, key) {
  if (!userId) return null;
  try {
    const raw = sessionStorage.getItem(k(userId, key));
    return raw ? JSON.parse(raw).data : null;
  } catch {
    return null;
  }
}

export function writeCache(userId, key, data) {
  if (!userId) return;
  try {
    sessionStorage.setItem(k(userId, key), JSON.stringify({ t: Date.now(), data }));
  } catch { /* storage full or blocked: caching is optional */ }
}

export function clearCache() {
  try {
    Object.keys(sessionStorage)
      .filter(x => x.startsWith(PREFIX))
      .forEach(x => sessionStorage.removeItem(x));
  } catch { /* ignore */ }
}
