/**
 * pages/PurchaseOrders.jsx — Purchase orders
 * Real data from /api/orders/purchase
 */

import { useState, useEffect } from 'react';
import { useApi } from '../lib/api';

function fmt(n) {
  if (n == null) return '—';
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_TABS = ['all', 'draft', 'sent', 'partial', 'received', 'cancelled'];
const STATUS_CLS = { draft: 'muted', sent: 'info', partial: 'warn', received: 'ok', cancelled: 'out' };

const EMPTY_LINE = { product_id: '', qty: '1', unit_price: '' };
const EMPTY_FORM = { supplier_id: '', expected_delivery: '', notes: '', lines: [] };

export default function PurchaseOrders() {
  const api = useApi();

  const [pos,       setPos]       = useState(null);    // null = first load
  const [selected,  setSelected]  = useState(null);
  const [tab,       setTab]       = useState('all');
  const [error,     setError]     = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [busy,      setBusy]      = useState(false);
  const reload = () => setReloadKey(k => k + 1);

  // new PO modal
  const [showNew,   setShowNew]   = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [products,  setProducts]  = useState([]);
  const [form,      setForm]      = useState(EMPTY_FORM);

  // receive modal
  const [recv, setRecv] = useState(null);   // { po, qtys: {itemId: string} }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get(`/orders/purchase${tab !== 'all' ? `?status=${tab}` : ''}`);
        if (cancelled) return;
        const list = data.purchase_orders || [];
        setPos(list);
        // keep the open detail panel in sync with the refreshed list
        setSelected(sel => (sel ? list.find(x => x.id === sel.id) || null : null));
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [api, tab, reloadKey]);

  const act = async (fn) => {
    setBusy(true);
    try { await fn(); reload(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const send    = (po) => act(() => api.post(`/orders/purchase/${po.id}/send`));
  const markPaid = (po) => act(() => api.post(`/orders/purchase/${po.id}/mark-paid`));

  // ── New PO ───────────────────────────────────────────────────────
  const openNew = async () => {
    try {
      const [s, p] = await Promise.all([api.get('/suppliers'), api.get('/products')]);
      setSuppliers(s.suppliers || []);
      setProducts(p.products || []);
    } catch (e) { setError(e.message); return; }
    setForm({ ...EMPTY_FORM, lines: [{ ...EMPTY_LINE }] });
    setShowNew(true);
  };

  const setLine = (i, patch) =>
    setForm(f => ({ ...f, lines: f.lines.map((l, j) => j === i ? { ...l, ...patch } : l) }));

  const pickProduct = (i, id) => {
    const p = products.find(x => x.id === id);
    setLine(i, { product_id: id, unit_price: p ? String(p.cost_price) : '' });
  };

  const validLines = form.lines.filter(l => l.product_id && Number(l.qty) > 0);
  const total = validLines.reduce((n, l) => n + Number(l.qty) * (Number(l.unit_price) || 0), 0);

  const createPO = () => act(async () => {
    await api.post('/orders/purchase', {
      supplier_id:       form.supplier_id,
      expected_delivery: form.expected_delivery || null,
      notes:             form.notes || null,
      items: validLines.map(l => ({
        product_id: l.product_id,
        qty:        parseInt(l.qty),
        unit_price: parseFloat(l.unit_price) || 0,
      })),
    });
    setShowNew(false);
    setTab('all');
  });

  // ── Receive ──────────────────────────────────────────────────────
  const openReceive = (po) => {
    const qtys = {};
    (po.purchase_order_items || []).forEach(i => { qtys[i.id] = String(i.qty_ordered - i.qty_received); });
    setRecv({ po, qtys });
  };

  const submitReceive = () => act(async () => {
    const items = Object.entries(recv.qtys)
      .map(([po_item_id, q]) => ({ po_item_id, qty_received: parseInt(q) || 0 }))
      .filter(i => i.qty_received > 0);
    if (!items.length) throw new Error('Enter a quantity to receive');
    await api.post(`/orders/purchase/${recv.po.id}/receive`, { items });
    setRecv(null);
  });

  const canReceive = (po) => ['sent', 'partial'].includes(po.status);

  return (
    <div className="im-page">
      <div className="im-page-header">
        <div>
          <h1 className="im-page-title">Purchase Orders</h1>
          <p className="im-page-sub">{pos === null ? 'Loading…' : `${pos.length} purchase orders`}</p>
        </div>
        <button className="im-btn-primary" onClick={openNew}>+ New purchase order</button>
      </div>

      {error && <div className="im-error" onClick={() => setError(null)}>{error} ✕</div>}

      <div className="im-tabs">
        {STATUS_TABS.map(t => (
          <button key={t} className={`im-tab ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); setPos(null); }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="im-split-layout">
        <div className="im-split-list">
          <div className="im-panel">
            {pos === null ? (
              Array(5).fill(0).map((_, i) => (
                <div key={i} className="im-list-row">
                  <div className="im-skeleton" style={{ height: 14, width: '50%', marginBottom: 6 }} />
                  <div className="im-skeleton" style={{ height: 11, width: '70%' }} />
                </div>
              ))
            ) : pos.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No purchase orders yet
              </div>
            ) : pos.map(po => (
              <div key={po.id}
                className={`im-list-row ${selected?.id === po.id ? 'active' : ''}`}
                onClick={() => setSelected(po)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="im-mono" style={{ fontSize: 13, fontWeight: 700 }}>{po.po_number}</span>
                  <span className={`im-status-badge ${STATUS_CLS[po.status] || 'muted'}`}>{po.status}</span>
                </div>
                <div className="im-list-sub">
                  {po.suppliers?.name} · {fmt(po.total_amount)} · {po.order_date}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="im-split-detail">
          {!selected ? (
            <div className="im-panel im-panel-empty">Select a purchase order to view details</div>
          ) : (
            <div className="im-panel">
              <div className="im-detail-header">
                <div>
                  <h2 className="im-detail-title">{selected.po_number}</h2>
                  <div className="im-detail-sub">{selected.suppliers?.name}</div>
                </div>
                <div className="im-row-actions">
                  {selected.status === 'draft' && (
                    <button className="im-btn-primary" disabled={busy} onClick={() => send(selected)}>Mark as sent</button>
                  )}
                  {canReceive(selected) && (
                    <button className="im-btn-primary" disabled={busy} onClick={() => openReceive(selected)}>Receive stock</button>
                  )}
                  {selected.payment_status !== 'paid' && selected.status !== 'cancelled' && (
                    <button className="im-btn-ghost" disabled={busy} onClick={() => markPaid(selected)}>Mark paid</button>
                  )}
                </div>
              </div>

              <div className="im-detail-grid">
                <div className="im-detail-field"><span>Status</span>
                  <span className={`im-status-badge ${STATUS_CLS[selected.status] || 'muted'}`}>{selected.status}</span>
                </div>
                <div className="im-detail-field"><span>Payment</span>
                  <span className={`im-status-badge ${selected.payment_status === 'paid' ? 'ok' : 'warn'}`}>{selected.payment_status}</span>
                </div>
                <div className="im-detail-field"><span>Order date</span><strong>{selected.order_date}</strong></div>
                {selected.expected_delivery && <div className="im-detail-field"><span>Expected</span><strong>{selected.expected_delivery}</strong></div>}
                {selected.suppliers?.lead_days != null && <div className="im-detail-field"><span>Lead time</span><strong>{selected.suppliers.lead_days} days</strong></div>}
              </div>

              {selected.purchase_order_items?.length > 0 && (
                <>
                  <div className="im-detail-section-title">Line items</div>
                  <table className="im-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th className="num">Ordered</th>
                        <th className="num">Received</th>
                        <th className="num">Unit cost</th>
                        <th className="num">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.purchase_order_items.map(i => (
                        <tr key={i.id}>
                          <td>
                            <div className="im-td-primary">{i.products?.name || '—'}</div>
                            <div className="im-td-sub"><span className="im-mono">{i.products?.sku}</span></div>
                          </td>
                          <td className="num">{i.qty_ordered}</td>
                          <td className="num">{i.qty_received}</td>
                          <td className="num">{fmt(i.unit_cost)}</td>
                          <td className="num">{fmt(i.line_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ padding: '12px 16px', textAlign: 'right', fontSize: 18, fontWeight: 800 }}>
                    Total: {fmt(selected.total_amount)}
                  </div>
                </>
              )}
              {selected.notes && <div style={{ padding: '0 16px 16px', color: 'var(--text-muted)', fontSize: 13 }}>{selected.notes}</div>}
            </div>
          )}
        </div>
      </div>

      {/* New PO modal */}
      {showNew && (
        <div className="im-modal-overlay" onClick={() => setShowNew(false)}>
          <div className="im-modal" style={{ maxWidth: 760, width: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="im-modal-header">
              <h2>New purchase order</h2>
              <button className="im-modal-close" onClick={() => setShowNew(false)}>✕</button>
            </div>
            <div className="im-modal-body">
              <div className="im-form-grid">
                <div className="im-field span-2">
                  <label>Supplier *</label>
                  <select value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}>
                    <option value="">Select supplier…</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="im-field">
                  <label>Expected delivery</label>
                  <input type="date" value={form.expected_delivery}
                    onChange={e => setForm(f => ({ ...f, expected_delivery: e.target.value }))} />
                </div>
                <div className="im-field">
                  <label>Notes</label>
                  <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>

              <div className="im-detail-section-title">Items</div>
              {form.lines.map((l, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 110px 28px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <select value={l.product_id} onChange={e => pickProduct(i, e.target.value)}>
                    <option value="">Select product…</option>
                    {products.map(x => <option key={x.id} value={x.id}>{x.name} ({x.sku})</option>)}
                  </select>
                  <input type="number" min="1" value={l.qty} title="Quantity"
                    onChange={e => setLine(i, { qty: e.target.value })} />
                  <input type="number" min="0" step="0.01" value={l.unit_price} title="Unit cost"
                    onChange={e => setLine(i, { unit_price: e.target.value })} />
                  <button className="im-modal-close" title="Remove line"
                    onClick={() => setForm(f => ({ ...f, lines: f.lines.filter((_, j) => j !== i) }))}>✕</button>
                </div>
              ))}
              <button className="im-btn-ghost" onClick={() => setForm(f => ({ ...f, lines: [...f.lines, { ...EMPTY_LINE }] }))}>
                + Add line
              </button>
              <div style={{ textAlign: 'right', fontSize: 18, fontWeight: 800, marginTop: 12 }}>Total: {fmt(total)}</div>
            </div>
            <div className="im-modal-footer">
              <button className="im-btn-ghost" onClick={() => setShowNew(false)}>Cancel</button>
              <button className="im-btn-primary" onClick={createPO}
                disabled={busy || !form.supplier_id || validLines.length === 0}>
                {busy ? 'Creating…' : 'Create draft PO'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receive modal */}
      {recv && (
        <div className="im-modal-overlay" onClick={() => setRecv(null)}>
          <div className="im-modal" onClick={e => e.stopPropagation()}>
            <div className="im-modal-header">
              <h2>Receive stock — {recv.po.po_number}</h2>
              <button className="im-modal-close" onClick={() => setRecv(null)}>✕</button>
            </div>
            <div className="im-modal-body">
              {(recv.po.purchase_order_items || []).map(i => {
                const remaining = i.qty_ordered - i.qty_received;
                return (
                  <div key={i.id} style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <div>
                      <div className="im-td-primary">{i.products?.name}</div>
                      <div className="im-td-sub">{remaining} of {i.qty_ordered} still to receive</div>
                    </div>
                    <input type="number" min="0" max={remaining} disabled={remaining === 0}
                      value={recv.qtys[i.id] ?? ''}
                      onChange={e => setRecv(r => ({ ...r, qtys: { ...r.qtys, [i.id]: e.target.value } }))} />
                  </div>
                );
              })}
            </div>
            <div className="im-modal-footer">
              <button className="im-btn-ghost" onClick={() => setRecv(null)}>Cancel</button>
              <button className="im-btn-primary" onClick={submitReceive} disabled={busy}>
                {busy ? 'Receiving…' : 'Receive into stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
