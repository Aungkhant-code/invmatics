import { useEffect, useMemo, useState } from 'react';
import { useApi } from './api';
import { MoneyContext, applyRates, readCachedRates, RATES_KEY, moneyKey } from './money';

/** Loads the org's default currency, timezone and live rates; remounts the app when they change. */
export function MoneyProvider({ children }) {
  const api = useApi();
  const [ready, setReady] = useState(() => {
    const c = readCachedRates();
    if (c) applyRates(c);
    return !!c;
  });
  const [n, setN] = useState(0);

  const load = useMemo(() => async () => {
    const before = moneyKey();
    const d = await api.get('/rates');
    applyRates(d);
    try { sessionStorage.setItem(RATES_KEY, JSON.stringify(d)); } catch { /* optional */ }
    return before !== moneyKey();
  }, [api]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const changed = await load();
        if (cancelled) return;
        setReady(true);
        if (changed) setN(x => x + 1);
      } catch {
        if (!cancelled) setReady(true);      // fall back to USD rather than block the app
      }
    })();
    return () => { cancelled = true; };
  }, [load]);

  const value = useMemo(() => ({
    reload: () => { load().then(() => setN(x => x + 1)).catch(() => {}); },
  }), [load]);

  if (!ready) return null;
  return (
    <MoneyContext.Provider value={value}>
      <div key={`${moneyKey()}|${n}`} style={{ display: 'contents' }}>{children}</div>
    </MoneyContext.Provider>
  );
}
