import { useState, useRef } from 'react';

// Type-to-search pickers. CurrencyInput and TimezoneInput use <datalist> (pick or type anything);
// SearchSelect is a combobox for choosing one record (customer, supplier) by typing part of its name.
// Currencies come from the browser (all ISO 4217 codes); timezones are every IANA zone.

const FALLBACK_CUR = ['USD', 'EUR', 'GBP', 'JPY', 'THB', 'SGD', 'MYR', 'IDR', 'VND', 'PHP', 'MMK', 'KHR', 'NZD', 'AUD', 'CNY', 'INR'];
const FALLBACK_TZ  = ['UTC', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Kuala_Lumpur', 'Asia/Jakarta', 'Asia/Ho_Chi_Minh',
  'Asia/Manila', 'Asia/Yangon', 'Asia/Tokyo', 'Asia/Kolkata', 'Asia/Dubai', 'Europe/London', 'Europe/Paris',
  'America/New_York', 'America/Los_Angeles', 'Pacific/Auckland', 'Australia/Sydney'];

function supported(kind, fallback) {
  try { return Intl.supportedValuesOf(kind); } catch { return fallback; }
}

let _cur, _tz;
function currencies() {
  if (!_cur) {
    let names = null;
    try { names = new Intl.DisplayNames(undefined, { type: 'currency' }); } catch { /* old browser */ }
    _cur = supported('currency', FALLBACK_CUR).map(c => [c, names ? (names.of(c) || c) : c]);
  }
  return _cur;
}
function timezones() {
  if (!_tz) {
    const list = supported('timeZone', FALLBACK_TZ);
    _tz = list.includes('UTC') ? list : ['UTC', ...list];
  }
  return _tz;
}

export function CurrencyInput({ value, onChange, id = 'im-currencies', ...rest }) {
  return (
    <>
      <input list={id} value={value || ''} placeholder="THB, USD… or your own"
        maxLength={10} autoCapitalize="characters"
        onChange={e => onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} {...rest} />
      <datalist id={id}>
        {currencies().map(([code, name]) => <option key={code} value={code}>{name}</option>)}
      </datalist>
    </>
  );
}

export function TimezoneInput({ value, onChange, id = 'im-timezones', ...rest }) {
  return (
    <>
      <input list={id} value={value || ''} placeholder="Start typing a city, e.g. Bangkok"
        onChange={e => onChange(e.target.value)} {...rest} />
      <datalist id={id}>
        {timezones().map(z => <option key={z} value={z} />)}
      </datalist>
    </>
  );
}


// Pick one record by typing part of its name, or open the list and choose.
// options: [{ id, label }]. value is the selected id ('' when nothing is chosen).
// onCreate(name) is optional: when given and the typed name matches no record, the list offers
// to add it. It must resolve to the new { id, label } (and add it to `options` in the parent).
export function SearchSelect({ value, onChange, options, placeholder = 'Search…', emptyText = 'No matches',
                               onCreate, createText = 'Add' }) {
  const [query,  setQuery]  = useState(null);   // null = not editing, show the chosen label
  const [open,   setOpen]   = useState(false);
  const [active, setActive] = useState(0);
  const [busy,   setBusy]   = useState(false);
  const [err,    setErr]    = useState('');
  const listRef = useRef(null);

  const selected = options.find(o => o.id === value);
  const text     = query ?? (selected ? selected.label : '');
  const typed    = (query || '').trim();
  const q        = typed.toLowerCase();
  const shown    = q ? options.filter(o => o.label.toLowerCase().includes(q)) : options;
  const canCreate = !!onCreate && !!typed && !options.some(o => o.label.trim().toLowerCase() === q);
  const total    = shown.length + (canCreate ? 1 : 0);

  const choose = (o) => { onChange(o.id); setQuery(null); setOpen(false); setErr(''); };

  const create = async () => {
    if (busy || !canCreate) return;
    setBusy(true); setErr('');
    try { choose(await onCreate(typed)); }
    catch (e) { setErr(e?.message || 'Could not add it'); }
    finally { setBusy(false); }
  };

  const pick = (i) => { if (i < shown.length) choose(shown[i]); else create(); };

  const scrollTo = (i) => {
    const el = listRef.current?.children[i];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault(); setOpen(true);
      const i = Math.min(active + 1, total - 1); setActive(i); scrollTo(i);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const i = Math.max(active - 1, 0); setActive(i); scrollTo(i);
    } else if (e.key === 'Enter') {
      if (open) { e.preventDefault(); if (total > 0) pick(Math.min(active, total - 1)); }
    } else if (e.key === 'Escape') {
      if (open) { e.stopPropagation(); setOpen(false); setQuery(null); setErr(''); }
    }
  };

  const onBlur = () => {
    if (busy) return;
    // Typed an exact name without picking it? Treat that as the choice.
    if (!value && q) {
      const exact = options.filter(o => o.label.trim().toLowerCase() === q);
      if (exact.length === 1) onChange(exact[0].id);
    }
    setOpen(false);
    setQuery(null);
    setErr('');
  };

  return (
    <div className="im-combo">
      <input type="text" role="combobox" aria-expanded={open} aria-autocomplete="list"
        autoComplete="off" value={text} placeholder={placeholder}
        onFocus={e => { setOpen(true); setActive(0); e.target.select(); }}
        onChange={e => { setQuery(e.target.value); setOpen(true); setActive(0); setErr(''); if (value) onChange(''); }}
        onKeyDown={onKeyDown} onBlur={onBlur} />
      {open && (
        <ul className="im-combo-list" role="listbox" ref={listRef}>
          {total === 0 && <li className="im-combo-empty">{emptyText}</li>}
          {shown.map((o, i) => (
            <li key={o.id} role="option" aria-selected={o.id === value}
              className={`im-combo-opt${i === active ? ' active' : ''}${o.id === value ? ' chosen' : ''}`}
              onMouseDown={e => { e.preventDefault(); choose(o); }}
              onMouseEnter={() => setActive(i)}>
              {o.label}
            </li>
          ))}
          {canCreate && (
            <li role="option" aria-selected="false"
              className={`im-combo-opt im-combo-new${active === shown.length ? ' active' : ''}`}
              onMouseDown={e => { e.preventDefault(); create(); }}
              onMouseEnter={() => setActive(shown.length)}>
              {busy ? 'Adding…' : <>+ {createText} <strong>“{typed}”</strong></>}
            </li>
          )}
          {err && <li className="im-combo-err">{err}</li>}
        </ul>
      )}
    </div>
  );
}
