/**
 * pages/StockMovements.jsx — Stock movement audit log
 * Real data from /api/inventory/movements
 */

import { useState, useEffect } from 'react';
import { useApi } from '../lib/api';
import { downloadCsv, stamp } from '../lib/exportCsv';

const PAGE = 50;

const TYPE_LABELS = {
  sale: 'Sale', receive: 'Receive', adjustment: 'Adjustment',
  damage: 'Damage', theft: 'Theft', return: 'Return', write_off: 'Write-off',
};
const TYPE_CLS = {
  sale: 'out', receive: 'ok', adjustment: 'info',
  damage: 'out', theft: 'out', return: 'ok', write_off: 'out',
};

// date_to is compared against a timestamp, so include the whole chosen day
function nextDay(d) {
  const x = new Date(`${d}T00:00:00`);
  x.setDate(x.getDate() + 1);
  return x.toISOString().slice(0, 10);
}

export default function StockMovements() {
  const api = useApi();

  const [rows,     setRows]     = useState(null);   // null = first load
  const [hasMore,  setHasMore]  = useState(false);
  const [busy,     setBusy]     = useState(false);
  const [error,    setError]    = useState(null);
  const [type,     setType]     = useState('');
  const [from,     setFrom]     = useState('');
  const [to,       setTo]       = useState('');
  const [search,   setSearch]   = useState('');

  const buildQuery = (offset) => {
    const q = new URLSearchParams({ limit: PAGE, offset });
    if (type) q.set('movement_type', type);
    if (from) q.set('date_from', from);
    if (to)   q.set('date_to', nextDay(to));
    return `/inventory/movements?${q}`;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const q = new URLSearchParams({ limit: PAGE, offset: 0 });
        if (type) q.set('movement_type', type);
        if (from) q.set('date_from', from);
        if (to)   q.set('date_to', nextDay(to));
        const data = await api.get(`/inventory/movements?${q}`);
        if (cancelled) return;
        setRows(data.movements || []);
        setHasMore((data.movements || []).length === PAGE);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [api, type, from, to]);

  const loadMore = async () => {
    setBusy(true);
    try {
      const data = await api.get(buildQuery(rows.length));
      const more = data.movements || [];
      setRows(r => [...r, ...more]);
      setHasMore(more.length === PAGE);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const term = search.trim().toLowerCase();
  const [exporting, setExporting] = useState(false);
  const exportSheet = async () => {
    setExporting(true);
    try {
      // fetch every page for the current filters, not just what's loaded on screen
      let all = [], offset = 0;
      for (let i = 0; i < 400; i++) {
        const data = await api.get(buildQuery(offset));
        const chunk = data.movements || [];
        all = all.concat(chunk);
        if (chunk.length < PAGE) break;
        offset += PAGE;
      }
      const q = search.trim().toLowerCase();
      const list = q ? all.filter(m =>
        (m.products?.name || '').toLowerCase().includes(q) ||
        (m.products?.sku || '').toLowerCase().includes(q) ||
        (m.notes || '').toLowerCase().includes(q)) : all;
      const rowsOut = [['Date', 'Product', 'SKU', 'Type', 'Change', 'Before', 'After', 'Reference', 'By', 'Notes']];
      list.forEach(m => rowsOut.push([
        m.created_at ? new Date(m.created_at).toLocaleString() : '',
        m.products?.name || '', m.products?.sku || '',
        TYPE_LABELS[m.movement_type] || m.movement_type,
        m.qty_change, m.qty_before, m.qty_after,
        m.ref_type || '', m.users?.full_name || '', m.notes || '',
      ]));
      downloadCsv(`stock-movements-${stamp()}`, rowsOut);
    } catch (e) { setError(e.message); }
    finally { setExporting(false); }
  };

  const shown = (rows || []).filter(m =>
    !term ||
    m.products?.name?.toLowerCase().includes(term) ||
    m.products?.sku?.toLowerCase().includes(term) ||
    m.notes?.toLowerCase().includes(term)
  );

  const unitsIn  = shown.reduce((n, m) => n + (m.qty_change > 0 ? m.qty_change : 0), 0);
  const unitsOut = shown.reduce((n, m) => n + (m.qty_change < 0 ? -m.qty_change : 0), 0);

  return (
    <div className="im-page">
      <div className="im-page-header">
        <div>
          <h1 className="im-page-title">Stock Movements</h1>
          <p className="im-page-sub">
            {rows === null ? 'Loading…' : `${shown.length} movements · +${unitsIn} in · −${unitsOut} out`}
          </p>
        </div>
        <button className="im-btn-ghost" onClick={exportSheet} disabled={exporting || rows === null}>
          {exporting ? 'Preparing…' : 'Download spreadsheet'}
        </button>
      </div>

      {error && <div className="im-error" onClick={() => setError(null)}>{error} ✕</div>}

      <div className="im-toolbar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input className="im-search" placeholder="Search product, SKU or notes…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="im-search" style={{ maxWidth: 170 }} value={type}
          onChange={e => { setType(e.target.value); setRows(null); }}>
          <option value="">All types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input className="im-search" type="date" style={{ maxWidth: 160 }} value={from} title="From"
          onChange={e => { setFrom(e.target.value); setRows(null); }} />
        <input className="im-search" type="date" style={{ maxWidth: 160 }} value={to} title="To"
          onChange={e => { setTo(e.target.value); setRows(null); }} />
      </div>

      <div className="im-panel">
        <div className="im-table-wrap">
          <table className="im-table">
            <thead>
              <tr>
                <th>Date</th><th>Product</th><th>Type</th>
                <th className="num">Change</th><th className="num">Before</th><th className="num">After</th>
                <th>Reference</th><th>By</th><th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows === null ? (
                Array(8).fill(0).map((_, i) => (
                  <tr key={i}>{Array(9).fill(0).map((_, j) => (
                    <td key={j}><div className="im-skeleton" style={{ height: 13, width: '80%' }} /></td>
                  ))}</tr>
                ))
              ) : shown.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                  No movements match these filters
                </td></tr>
              ) : shown.map(m => (
                <tr key={m.id}>
                  <td>
                    <span className="im-mono" style={{ fontSize: 11 }}>
                      {m.created_at ? new Date(m.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                    </span>
                  </td>
                  <td>
                    <div className="im-td-primary">{m.products?.name || '—'}</div>
                    <div className="im-td-sub">{m.products?.sku}</div>
                  </td>
                  <td><span className={`im-status-badge ${TYPE_CLS[m.movement_type] || 'info'}`}>
                    {TYPE_LABELS[m.movement_type] || m.movement_type}
                  </span></td>
                  <td className="num" style={{ fontWeight: 700, color: m.qty_change > 0 ? 'var(--green)' : 'var(--red)' }}>
                    {m.qty_change > 0 ? `+${m.qty_change}` : m.qty_change}
                  </td>
                  <td className="num">{m.qty_before}</td>
                  <td className="num">{m.qty_after}</td>
                  <td><span className="im-mono" style={{ fontSize: 11 }}>{m.ref_type || '—'}</span></td>
                  <td style={{ fontSize: 12 }}>{m.users?.full_name || '—'}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{m.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {hasMore && (
          <div style={{ padding: 12, textAlign: 'center' }}>
            <button className="im-btn-ghost" onClick={loadMore} disabled={busy}>
              {busy ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
