// pages/Inventory.jsx
/**
 * pages/Inventory.jsx — Stock management
 * Real data from /api/inventory/stock and /api/inventory/movements
 */

import { useState, useEffect } from 'react';
import { useApi } from '../lib/api';

const MOVEMENT_TYPES = ['adjustment', 'damage', 'theft', 'return', 'write_off'];

const TYPE_LABELS = {
  sale: 'Sale', receive: 'Receive', adjustment: 'Adjustment',
  damage: 'Damage', theft: 'Theft', return: 'Return', write_off: 'Write-off',
};

const TYPE_CLS = {
  sale: 'out', receive: 'ok', adjustment: 'info',
  damage: 'out', theft: 'out', return: 'ok', write_off: 'out',
};

function fmt(n) {
  if (n == null) return '—';
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function Inventory() {
  const api = useApi();

  const [view,       setView]       = useState('stock');   // 'stock' | 'movements'
  const [stock,      setStock]      = useState(null);   // null = not loaded yet
  const [movements,  setMovements]  = useState(null);
  const [search,     setSearch]     = useState('');
  const [reloadKey,  setReloadKey]  = useState(0);
  const [error,      setError]      = useState(null);
  const [showAdj,    setShowAdj]    = useState(false);
  const [products,   setProducts]   = useState([]);
  const [adjForm,    setAdjForm]    = useState({ product_id: '', movement_type: 'adjustment', qty_change: '', notes: '' });
  const [saving,     setSaving]     = useState(false);
  const [debounced,  setDebounced]  = useState('');

  // Wait for typing to pause before hitting the API
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Load the active view. Old rows stay visible while a refresh is in flight.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (view === 'stock') {
          const data = await api.get(`/inventory/stock${debounced ? `?search=${encodeURIComponent(debounced)}` : ''}`);
          if (!cancelled) setStock(data.products || []);
        } else {
          const data = await api.get('/inventory/movements?limit=50');
          if (!cancelled) setMovements(data.movements || []);
        }
        if (!cancelled) setError(null);
      } catch (e) {
        if (!cancelled) setError(e.message);
        // leave the skeleton state so a failed first load doesn't show "No products"
      }
    })();
    return () => { cancelled = true; };
  }, [api, view, debounced, reloadKey]);

  const openAdj = async () => {
    try {
      const data = await api.get('/products');
      setProducts(data.products || []);
    } catch (e) { setError(e.message); return; }
    setAdjForm({ product_id: '', movement_type: 'adjustment', qty_change: '', notes: '' });
    setShowAdj(true);
  };

  const saveAdj = async () => {
    setSaving(true);
    try {
      await api.post('/inventory/adjust', {
        product_id:    adjForm.product_id,
        movement_type: adjForm.movement_type,
        qty_change:    parseInt(adjForm.qty_change) || 0,
        notes:         adjForm.notes || null,
      });
      setShowAdj(false);
      setReloadKey(k => k + 1);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const SEV_CLS  = { out: 'out', critical: 'out', low: 'warn', warning: 'warn', ok: 'ok' };
  const SEV_LABEL = { out: 'Out', critical: 'Critical', low: 'Low', warning: 'Warning', ok: 'OK' };

  return (
    <div className="im-page">

      <div className="im-page-header">
        <div>
          <h1 className="im-page-title">Inventory</h1>
          <p className="im-page-sub">Stock levels and movement history</p>
        </div>
        <button className="im-btn-primary" onClick={openAdj}>+ Adjustment</button>
      </div>

      {error && <div className="im-error">{error}</div>}

      {/* View toggle */}
      <div className="im-tabs">
        <button className={`im-tab ${view === 'stock' ? 'active' : ''}`} onClick={() => setView('stock')}>
          Stock levels
        </button>
        <button className={`im-tab ${view === 'movements' ? 'active' : ''}`} onClick={() => setView('movements')}>
          Movement history
        </button>
      </div>

      {view === 'stock' && (
        <>
          <div className="im-toolbar">
            <input className="im-search" placeholder="Search products…" value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="im-panel">
            <div className="im-table-wrap">
              <table className="im-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th className="num">On hand</th>
                    <th className="num">Reserved</th>
                    <th className="num">Available</th>
                    <th className="num">On order</th>
                    <th className="num">Reorder at</th>
                    <th className="num">Stock value</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stock === null ? (
                    Array(5).fill(0).map((_, i) => (
                      <tr key={i}>{Array(9).fill(0).map((_, j) => (
                        <td key={j}><div className="im-skeleton" style={{ height: 13, width: '75%' }} /></td>
                      ))}</tr>
                    ))
                  ) : stock.length === 0 ? (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                      No products found
                    </td></tr>
                  ) : stock.map(p => (
                    <tr key={p.id}>
                      <td><div className="im-td-primary">{p.name}</div></td>
                      <td><span className="im-mono">{p.sku}</span></td>
                      <td className="num" style={{ fontWeight: 700, color: p.qty_on_hand === 0 ? 'var(--red)' : 'var(--text-primary)' }}>
                        {p.qty_on_hand}
                      </td>
                      <td className="num">{p.qty_reserved}</td>
                      <td className="num">{p.qty_available}</td>
                      <td className="num">{p.qty_on_order}</td>
                      <td className="num">{p.reorder_point}</td>
                      <td className="num">{fmt(p.stock_value)}</td>
                      <td><span className={`im-status-badge ${SEV_CLS[p.severity] || 'ok'}`}>
                        {SEV_LABEL[p.severity] || 'OK'}
                      </span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {view === 'movements' && (
        <div className="im-panel">
          <div className="im-table-wrap">
            <table className="im-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th className="num">Change</th>
                  <th className="num">Before</th>
                  <th className="num">After</th>
                  <th>Ref</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {movements === null ? (
                  Array(8).fill(0).map((_, i) => (
                    <tr key={i}>{Array(8).fill(0).map((_, j) => (
                      <td key={j}><div className="im-skeleton" style={{ height: 13, width: '80%' }} /></td>
                    ))}</tr>
                  ))
                ) : movements.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                    No movements recorded yet
                  </td></tr>
                ) : movements.map(m => (
                  <tr key={m.id}>
                    <td><span className="im-mono" style={{ fontSize: 11 }}>{m.created_at?.slice(0, 10)}</span></td>
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
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{m.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjustment modal */}
      {showAdj && (
        <div className="im-modal-overlay" onClick={() => setShowAdj(false)}>
          <div className="im-modal" onClick={e => e.stopPropagation()}>
            <div className="im-modal-header">
              <h2>Record stock adjustment</h2>
              <button className="im-modal-close" onClick={() => setShowAdj(false)}>✕</button>
            </div>
            <div className="im-modal-body">
              <div className="im-form-grid">
                <div className="im-field span-2">
                  <label>Product *</label>
                  <select value={adjForm.product_id} onChange={e => setAdjForm(f => ({ ...f, product_id: e.target.value }))}>
                    <option value="">Select product…</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                  </select>
                </div>
                <div className="im-field">
                  <label>Type *</label>
                  <select value={adjForm.movement_type} onChange={e => setAdjForm(f => ({ ...f, movement_type: e.target.value }))}>
                    {MOVEMENT_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div className="im-field">
                  <label>Quantity *</label>
                  <input type="number" placeholder="e.g. 5 or -3"
                    value={adjForm.qty_change}
                    onChange={e => setAdjForm(f => ({ ...f, qty_change: e.target.value }))} />
                </div>
                <div className="im-field span-2">
                  <label>Notes</label>
                  <input value={adjForm.notes} placeholder="Reason for adjustment…"
                    onChange={e => setAdjForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="im-modal-footer">
              <button className="im-btn-ghost" onClick={() => setShowAdj(false)}>Cancel</button>
              <button className="im-btn-primary" onClick={saveAdj} disabled={saving || !adjForm.product_id}>
                {saving ? 'Saving…' : 'Record adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}