/**
 * pages/Orders.jsx — Sales orders
 * Real data from /api/orders/sales
 */

import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../lib/api';

function fmt(n) {
  if (n == null) return '—';
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_TABS = ['all', 'draft', 'confirmed', 'dispatched', 'delivered', 'cancelled'];

const STATUS_CLS = {
  draft: 'muted', confirmed: 'info', dispatched: 'blue',
  delivered: 'ok', cancelled: 'out',
};

export default function Orders() {
  const api = useApi();

  const [orders,   setOrders]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [tab,      setTab]      = useState('all');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [search,   setSearch]   = useState('');

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (tab !== 'all') params.set('status', tab);
      if (search) params.set('search', search);
      const data = await api.get(`/orders/sales?${params}`);
      setOrders(data.orders || []);
      setError(null);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [api, tab, search]);

  useEffect(() => {
    // load() only sets state after the network await, never synchronously
    (async () => { await load(); })();
  }, [load]);

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
    } catch (e) { setError(e.message); }
  };

  const downloadDO = async (orderId) => {
    try {
      const data = await api.get(`/delivery-orders?sales_order_id=${orderId}`);
      const dos = data.delivery_orders || [];
      if (dos.length === 0) {
        setError('No delivery order has been created for this order yet');
        return;
      }
      const url = await api.pdf(`/delivery-orders/${dos[0].do_number}/pdf`);
      window.open(url, '_blank');
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="im-page">
      <div className="im-page-header">
        <div>
          <h1 className="im-page-title">Sales Orders</h1>
          <p className="im-page-sub">{orders.length} orders</p>
        </div>
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
            {loading ? (
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
                  <button className="im-btn-ghost" onClick={() => downloadDO(selected.id)}>
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
    </div>
  );
}