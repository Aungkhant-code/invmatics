/**
 * pages/LowStock.jsx — Products at or below their reorder point
 * Real data from /api/inventory/low-stock; reorders create draft POs via /api/orders/purchase
 */

import { useState, useEffect } from 'react';
import { useApi } from '../lib/api';
import { fmt, convert } from '../lib/money';

// cost in the default currency (the product may be priced in another one)
const costBase = (p) => convert(p.cost_price || 0, p.currency) ?? (p.cost_price || 0);

const SECTIONS = [
  { key: 'critical', title: 'Critical',         desc: 'At or below 50% of reorder point', cls: 'out'  },
  { key: 'low',      title: 'Low stock',        desc: 'Below reorder point',              cls: 'warn' },
  { key: 'warning',  title: 'At reorder point', desc: 'Exactly at reorder point',         cls: 'warn' },
];

export default function LowStock() {
  const api = useApi();

  const [data,     setData]     = useState(null);     // null = first load
  const [error,    setError]    = useState(null);
  const [selected, setSelected] = useState([]);       // product ids
  const [qtys,     setQtys]     = useState({});       // product id -> order qty override
  const [creating, setCreating] = useState(false);
  const [result,   setResult]   = useState(null);     // { made: [po_number], failed: [msg] }
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await api.get('/inventory/low-stock');
        if (!cancelled) { setData(d); setError(null); }
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [api, reloadKey]);

  const all = data ? SECTIONS.flatMap(s => data[s.key] || []) : [];
  const byId = Object.fromEntries(all.map(p => [p.id, p]));
  const qtyFor = (p) => Number(qtys[p.id] ?? p.reorder_qty) || 0;
  const orderable = (p) => !!p.supplier_id;

  const toggle = (id) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const chosen = selected.map(id => byId[id]).filter(Boolean);
  const chosenCost = chosen.reduce((n, p) => n + qtyFor(p) * costBase(p), 0);

  const createOrders = async () => {
    setCreating(true);
    setResult(null);
    // One draft PO per supplier
    const groups = {};
    chosen.forEach(p => { (groups[p.supplier_id] ||= []).push(p); });
    const made = [], failed = [];
    for (const [supplier_id, items] of Object.entries(groups)) {
      try {
        const po = await api.post('/orders/purchase', {
          supplier_id,
          notes: 'Created from Low Stock',
          items: items.map(p => ({
            product_id: p.id, qty: qtyFor(p), unit_price: Math.round(costBase(p) * 100) / 100,
          })),
        });
        made.push(po.po_number);
      } catch (e) {
        failed.push(`${items[0].suppliers?.name || 'Supplier'}: ${e.message}`);
      }
    }
    setResult({ made, failed });
    setSelected([]);
    setCreating(false);
    setReloadKey(k => k + 1);   // refresh: qty_on_order changes
  };

  return (
    <div className="im-page">
      <div className="im-page-header">
        <div>
          <h1 className="im-page-title">Low Stock</h1>
          <p className="im-page-sub">
            {data === null ? 'Loading…' : `${data.total} product${data.total === 1 ? '' : 's'} need attention`}
          </p>
        </div>
        {chosen.length > 0 && (
          <button className="im-btn-primary" onClick={createOrders} disabled={creating}>
            {creating ? 'Creating…' : `Create PO for ${chosen.length} item${chosen.length === 1 ? '' : 's'} · ${fmt(chosenCost)}`}
          </button>
        )}
      </div>

      {error && <div className="im-error" onClick={() => setError(null)}>{error} ✕</div>}
      {result && (
        <div className="im-error" style={{ background: result.failed.length ? undefined : 'var(--green-bg, #ECFDF5)' }}
          onClick={() => setResult(null)}>
          {result.made.length > 0 && <>Draft purchase orders created: {result.made.join(', ')}. </>}
          {result.failed.map((m, i) => <span key={i}>Failed — {m}. </span>)} ✕
        </div>
      )}

      {data === null ? (
        <div className="im-panel">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="im-list-row">
              <div className="im-skeleton" style={{ height: 14, width: '40%', marginBottom: 6 }} />
              <div className="im-skeleton" style={{ height: 11, width: '60%' }} />
            </div>
          ))}
        </div>
      ) : data.total === 0 ? (
        <div className="im-panel im-panel-empty">All stock levels are healthy ✓</div>
      ) : SECTIONS.map(sec => {
        const items = data[sec.key] || [];
        if (!items.length) return null;
        return (
          <div key={sec.key} style={{ marginBottom: 20 }}>
            <div className="im-detail-section-title">
              {sec.title} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>· {sec.desc} · {items.length}</span>
            </div>
            <div className="im-panel">
              <div className="im-table-wrap">
                <table className="im-table">
                  <thead>
                    <tr>
                      <th style={{ width: 32 }}></th>
                      <th>Product</th>
                      <th className="num">On hand</th>
                      <th className="num">Reorder at</th>
                      <th className="num">On order</th>
                      <th>Supplier</th>
                      <th className="num">Order qty</th>
                      <th className="num">Est. cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(p => (
                      <tr key={p.id}>
                        <td>
                          <input type="checkbox" checked={selected.includes(p.id)}
                            disabled={!orderable(p)} title={orderable(p) ? '' : 'Assign a supplier to this product first'}
                            onChange={() => toggle(p.id)} />
                        </td>
                        <td>
                          <div className="im-td-primary">{p.name}</div>
                          <div className="im-td-sub"><span className="im-mono">{p.sku}</span></div>
                        </td>
                        <td className="num" style={{ fontWeight: 700, color: p.qty_on_hand === 0 ? 'var(--red)' : 'inherit' }}>
                          {p.qty_on_hand}
                        </td>
                        <td className="num">{p.reorder_point}</td>
                        <td className="num">{p.qty_on_order}</td>
                        <td>
                          {p.suppliers?.name || <span style={{ color: 'var(--text-muted)' }}>No supplier</span>}
                          {p.suppliers && <div className="im-td-sub">{p.suppliers.lead_days}d lead · est. {p.est_arrival}</div>}
                        </td>
                        <td className="num">
                          <input type="number" min="1" style={{ width: 70, textAlign: 'right' }}
                            value={qtys[p.id] ?? p.reorder_qty}
                            onChange={e => setQtys(q => ({ ...q, [p.id]: e.target.value }))} />
                        </td>
                        <td className="num">{fmt(qtyFor(p) * costBase(p))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
