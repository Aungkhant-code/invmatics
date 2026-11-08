// Light / dark theme for the app (not the landing or sign-in pages). Stored per browser.
const KEY = 'im:theme';

export function getTheme() {
  try { return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
}

export function saveTheme(theme) {
  try { localStorage.setItem(KEY, theme); } catch { /* private mode: just don't remember it */ }
}

export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'dark') { root.dataset.theme = 'dark'; root.style.colorScheme = 'dark'; }
  else { delete root.dataset.theme; root.style.colorScheme = ''; }
}
