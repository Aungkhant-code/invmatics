import { createContext, useContext } from 'react';

/**
 * lib/money.jsx — currency + timezone for the whole app.
 *
 * The organisation's default currency ("base") comes from /rates along with live exchange
 * rates (1 USD = x). Everything is shown in the base currency; a document or product entered
 * in another currency shows its own amount in brackets. `fmt`/`fmtDoc` are plain functions
 * reading a module-level snapshot, and the provider remounts the app when the base changes.
 */

export const RATES_KEY = 'im:v1:rates';

const snap = { base: 'USD', timezone: 'UTC', rates: { USD: 1 }, asOf: null };

export function applyRates(d) {
  snap.base = (d.base || 'USD').toUpperCase();
  snap.timezone = d.timezone || 'UTC';
  snap.rates = d.rates || { USD: 1 };
  snap.asOf = d.as_of || null;
}

export function readCachedRates() {
  try { return JSON.parse(sessionStorage.getItem(RATES_KEY)); } catch { return null; }
}

/** Multiply by this to turn `from` into `to`; null when either currency has no known rate. */
export function rateFor(from, to = snap.base) {
  from = (from || snap.base).toUpperCase(); to = (to || snap.base).toUpperCase();
  if (from === to) return 1;
  const a = snap.rates[from], b = snap.rates[to];
  return a && b ? b / a : null;
}

export const convert = (n, from, to = snap.base) => {
  const r = rateFor(from, to);
  return r == null ? null : Number(n) * r;
};

/** "THB 1,234.50" — works for any code, including custom ones Intl doesn't know. */
export function fmt(n, cur = snap.base) {
  if (n == null || n === '' || Number.isNaN(Number(n))) return '—';
  const code = (cur || snap.base).toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: code, currencyDisplay: 'code' }).format(Number(n));
  } catch {
    return `${code} ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

/** A document row (order/invoice/PO) with `currency` + `exchange_rate`: base amount, own amount in brackets. */
export function fmtDoc(n, row) {
  if (n == null) return '—';
  const cur = (row?.currency || snap.base).toUpperCase();
  if (cur === snap.base) return fmt(n);
  const fx = Number(row?.exchange_rate) || rateFor(cur) || 1;
  return `${fmt(Number(n) * fx)} (${fmt(n, cur)})`;
}

/** A product price (product has its own `currency`): converted at today's rate. */
export function fmtProduct(n, product) {
  if (n == null) return '—';
  const cur = (product?.currency || snap.base).toUpperCase();
  if (cur === snap.base) return fmt(n);
  const c = convert(n, cur);
  return c == null ? fmt(n, cur) : `${fmt(c)} (${fmt(n, cur)})`;
}

/** `amount` in `from`, expressed in `to`, as a form-friendly string ('' if no rate is known). */
export function priceIn(amount, from, to) {
  const c = convert(amount, from || snap.base, to || snap.base);
  return c == null ? String(amount ?? '') : String(Math.round(c * 100) / 100);
}

/** The rate to use on a new document: what the user typed, else today's live rate (null if neither). */
export function effectiveRate(currency, typed) {
  const cur = currency || snap.base;
  if (cur === snap.base) return 1;
  const t = parseFloat(typed);
  return t > 0 ? t : rateFor(cur);
}

export const baseCurrency = () => snap.base;
export const moneyKey = () => `${snap.base}|${snap.timezone}`;

export function fmtDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: snap.timezone }).format(new Date(iso));
  } catch { return String(iso); }
}

export function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: snap.timezone }).format(new Date(iso));
  } catch { return String(iso); }
}


export const MoneyContext = createContext({ reload: () => {} });
export const useMoney = () => useContext(MoneyContext);
