/**
 * pages/Orders.jsx — Sales orders
 * Real data from /api/orders/sales
 */

import { useState, useEffect } from 'react';
import { useApi } from '../lib/api';

function fmt(n) {
  if (n == null) return '—';
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const EMPTY_LINE = { product_id: '', qty: '1', unit_price: '' };
const EMPTY_FORM = { customer_id: '', due_date: '', customer_ref: '', notes: '', lines: [] };

const STATUS_TABS = ['all', 'draft', 'confirmed', 'dispatched', 'delivered', 'cancelled'];

const STATUS_CLS = {
  draft: 'muted', confirmed: 'info', dispatched: 'blue',
  delivered: 'ok', cancelled: 'out',
};

export default function Orders() {
  const api = useApi();

  const [orders,   setOrders]   = useState(null);   // null = first load
  const [selected, setSelected] = useState(null);
  const [tab,      setTab]      = useState('all');
  const [error,    setError]    = useState(null);
  const [search,   setSearch]   = useState('');
  const [debounced, setDebounced] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const load = () => setReloadKey(k => k + 1);

  // new-order modal
  const [showNew,   setShowNew]   = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products,  setProducts]  = useState([]);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams();
        if (tab !== 'all') params.set('status', tab);
        if (debounced) params.set('search', debounced);
        const data = await api.get(`/orders/sales?${params}`);
        if (!cancelled) { setOrders(data.orders || []); setError(null); }
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [api, tab, debounced, reloadKey]);

  const openNew = async () => {
    try {
      const [c, p] = await Promise.all([api.get('/customers'), api.get('/products')]);
      setCustomers(c.customers || []);
      setProducts(p.products || []);
    } catch (e) { setError(e.message); return; }
    setForm({ ...EMPTY_FORM, lines: [{ ...EMPTY_LINE }] });
    setShowNew(true);
  };

  const setLine = (i, patch) =>
    setForm(f => ({ ...f, lines: f.lines.map((l, j) => j === i ? { ...l, ...patch } : l) }));

  const pickProduct = (i, productId) => {
    const p = products.find(x => x.id === productId);
    setLine(i, { product_id: productId, unit_price: p ? String(p.selling_price) : '' });
  };

  const validLines = form.lines.filter(l => l.product_id && Number(l.qty) > 0);
  const orderTotal = validLines.reduce((n, l) => n + Number(l.qty) * (Number(l.unit_price) || 0), 0);

  const createOrder = async () => {
    setSaving(true);
    try {
      await api.post('/orders/sales', {
        customer_id:  form.customer_id,
        due_date:     form.due_date || null,
        customer_ref: form.customer_ref || null,
        notes:        form.notes || null,
        items: validLines.map(l => ({
          product_id: l.product_id,
          qty:        parseInt(l.qty),
          unit_price: parseFloat(l.unit_price) || 0,
        })),
      });
      setShowNew(false);
      setTab('all');
      load();
      setSelected(null);
      setError(null);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const dispatch = async (id) => {
    if (!confirm('Mark this order as dispatched? This will reduce stock levels.')) return;
    try {
      await api.post(`/orders/sales/${id}/dispatch`);
      load();
      if (selected?.id === id) setSelected(prev => ({ ...prev, status: 'dispatched' }));
    } catch (e) { setError(e.message); }
  };

  const markPaid = async (id) => {
    try {
      await api.post(`/orders/sales/${id}/mark-paid`);
      load();
      if (selected?.id === id) setSelected(prev => ({ ...prev, payment_status: 'paid' }));
    } catch (e) { setError(e.message); }
  };

  const downloadDO = async (orderNumber) => {
    try {
      const url = await api.pdf(`/delivery-orders/${orderNumber}/pdf`);
      window.open(url, '_blank');
    } catch { setError('No delivery order found for this order'); }
  };

  return (
    <div className="im-page">
      <div className="im-page-header">
        <div>
          <h1 className="im-page-title">Sales Orders</h1>
          <p className="im-page-sub">{orders === null ? 'Loading…' : `${orders.length} orders`}</p>
        </div>
        <button className="im-btn-primary" onClick={openNew}>+ New sales order</button>
      </div>

      {error && <div className="im-error" onClick={() => setError(null)}>{error} ✕</div>}

      {/* Status tabs */}
      <div className="im-tabs">
        {STATUS_TABS.map(t => (
          <button key={t} className={`im-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="im-toolbar">
        <input className="im-search" placeholder="Search by order ref or customer PO…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="im-split-layout">
        {/* Order list */}
        <div className="im-split-list">
          <div className="im-panel">
            {orders === null ? (
              Array(6).fill(0).map((_, i) => (
                <div key={i} className="im-list-row">
                  <div className="im-skeleton" style={{ height: 14, width: '50%', marginBottom: 6 }} />
                  <div className="im-skeleton" style={{ height: 11, width: '70%' }} />
                </div>
              ))
            ) : orders.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No orders found
              </div>
            ) : orders.map(o => (
              <div key={o.id}
                className={`im-list-row ${selected?.id === o.id ? 'active' : ''}`}
                onClick={() => setSelected(o)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="im-mono" style={{ fontSize: 13, fontWeight: 700 }}>{o.order_number}</span>
                  <span className={`im-status-badge ${STATUS_CLS[o.status] || 'muted'}`}>{o.status}</span>
                </div>
                <div className="im-list-sub">
                  {o.customers?.name} · {fmt(o.total_amount)} · {o.order_date}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order detail */}
        <div className="im-split-detail">
          {!selected ? (
            <div className="im-panel im-panel-empty">Select an order to view details</div>
          ) : (
            <div className="im-panel">
              <div className="im-detail-header">
                <div>
                  <h2 className="im-detail-title">{selected.order_number}</h2>
                  <div className="im-detail-sub">{selected.customers?.name}</div>
                </div>
                <div className="im-row-actions">
                  {selected.status === 'confirmed' && (
                    <button className="im-btn-primary" onClick={() => dispatch(selected.id)}>
                      Dispatch
                    </button>
                  )}
                  {selected.payment_status === 'unpaid' && selected.status !== 'cancelled' && (
                    <button className="im-btn-ghost" onClick={() => markPaid(selected.id)}>
                      Mark paid
                    </button>
                  )}
                  <button className="im-btn-ghost" onClick={() => downloadDO(selected.order_number)}>
                    Delivery order PDF
                  </button>
                </div>
              </div>

              <div className="im-detail-grid">
                <div className="im-detail-field"><span>Status</span>
                  <span className={`im-status-badge ${STATUS_CLS[selected.status]}`}>{selected.status}</span>
                </div>
                <div className="im-detail-field"><span>Payment</span>
                  <span className={`im-status-badge ${selected.payment_status === 'paid' ? 'ok' : selected.payment_status === 'overdue' ? 'out' : 'warn'}`}>
                    {selected.payment_status}
                  </span>
                </div>
                <div className="im-detail-field"><span>Order date</span><strong>{selected.order_date}</strong></div>
                {selected.due_date && <div className="im-detail-field"><span>Due</span><strong>{selected.due_date}</strong></div>}
                {selected.customer_ref && <div className="im-detail-field"><span>Customer PO</span><strong>{selected.customer_ref}</strong></div>}
              </div>

              {/* Line items */}
              {selected.sales_order_items?.length > 0 && (
                <>
                  <div className="im-detail-section-title">Line items</div>
                  <table className="im-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th className="num">Ordered</th>
                        <th className="num">Dispatched</th>
                        <th className="num">Unit price</th>
                        <th className="num">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.sales_order_items.map(item => (
                        <tr key={item.id}>
                          <td>{item.description}</td>
                          <td className="num">{item.qty_ordered}</td>
                          <td className="num">{item.qty_dispatched}</td>
                          <td className="num">{fmt(item.unit_price)}</td>
                          <td className="num">{fmt(item.line_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                      Subtotal: {fmt(selected.subtotal)}  ·  Tax: {fmt(selected.tax_amount)}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>Total: {fmt(selected.total_amount)}</div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {showNew && (
        <div className="im-modal-overlay" onClick={() => setShowNew(false)}>
          <div className="im-modal" style={{ maxWidth: 760, width: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="im-modal-header">
              <h2>New sales order</h2>
              <button className="im-modal-close" onClick={() => setShowNew(false)}>✕</button>
            </div>
            <div className="im-modal-body">
              <div className="im-form-grid">
                <div className="im-field span-2">
                  <label>Customer *</label>
                  <select value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}>
                    <option value="">Select customer…</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="im-field">
                  <label>Due date</label>
                  <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
                <div className="im-field">
                  <label>Customer PO ref</label>
                  <input value={form.customer_ref} onChange={e => setForm(f => ({ ...f, customer_ref: e.target.value }))} />
                </div>
              </div>

              <div className="im-detail-section-title">Items</div>
              {form.lines.map((l, i) => {
                const p = products.find(x => x.id === l.product_id);
                const avail = p ? (p.stock_levels?.qty_on_hand ?? 0) - (p.stock_levels?.qty_reserved ?? 0) : null;
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 110px 28px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <select value={l.product_id} onChange={e => pickProduct(i, e.target.value)}>
                      <option value="">Select product…</option>
                      {products.map(x => <option key={x.id} value={x.id}>{x.name} ({x.sku})</option>)}
                    </select>
                    <input type="number" min="1" value={l.qty} title="Quantity"
                      onChange={e => setLine(i, { qty: e.target.value })} />
                    <input type="number" min="0" step="0.01" value={l.unit_price} title="Unit price"
                      onChange={e => setLine(i, { unit_price: e.target.value })} />
                    <button className="im-modal-close" title="Remove line"
                      onClick={() => setForm(f => ({ ...f, lines: f.lines.filter((_, j) => j !== i) }))}>✕</button>
                    {avail !== null && Number(l.qty) > avail && (
                      <div style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--orange, #D97706)' }}>
                        Only {avail} available (on hand minus reserved) — dispatch will be blocked until stock arrives.
                      </div>
                    )}
                  </div>
                );
              })}
              <button className="im-btn-ghost" onClick={() => setForm(f => ({ ...f, lines: [...f.lines, { ...EMPTY_LINE }] }))}>
                + Add line
              </button>

              <div className="im-field span-2" style={{ marginTop: 12 }}>
                <label>Notes (shown on documents)</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div style={{ textAlign: 'right', fontSize: 18, fontWeight: 800, marginTop: 12 }}>
                Total: {fmt(orderTotal)}
              </div>
            </div>
            <div className="im-modal-footer">
              <button className="im-btn-ghost" onClick={() => setShowNew(false)}>Cancel</button>
              <button className="im-btn-primary" onClick={createOrder}
                disabled={saving || !form.customer_id || validLines.length === 0}>
                {saving ? 'Creating…' : 'Create order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}