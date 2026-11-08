/**
 * pages/Invoices.jsx — Invoice management
 * Real data from /api/invoices
 */

import { useState, useEffect } from 'react';
import { useApi } from '../lib/api';
import { fmtDoc } from '../lib/money';

const STATUS_TABS = ['all', 'draft', 'sent', 'paid', 'overdue', 'void'];

const STATUS_CLS = {
  draft: 'muted', sent: 'info', paid: 'ok', overdue: 'out', void: 'out',
};

export default function Invoices() {
  const api = useApi();

  const [invoices, setInvoices] = useState(null);   // null = first load
  const [selected, setSelected] = useState(null);
  const [tab,      setTab]      = useState('all');
  const [error,    setError]    = useState(null);
  const [search,   setSearch]   = useState('');
  const [payForm,  setPayForm]  = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const load = () => setReloadKey(k => k + 1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get(`/invoices${tab !== 'all' ? `?status=${tab}` : ''}`);
        if (cancelled) return;
        const list = data.invoices || [];
        setInvoices(list);
        setError(null);
        // refresh the open panel's header data from the new list
        setSelected(sel => sel ? (list.find(i => i.id === sel.id) ? { ...sel, ...list.find(i => i.id === sel.id) } : null) : null);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [api, tab, reloadKey]);

  // list rows lack payments; load the full invoice when one is opened
  const open = async (inv) => {
    setSelected(inv);
    try { setSelected(await api.get(`/invoices/${inv.id}`)); }
    catch (e) { setError(e.message); }
  };

  const setStatus = async (inv, status) => {
    if (status === 'void' && !confirm(`Void invoice ${inv.invoice_number}? This can't be undone.`)) return;
    setSaving(true);
    try {
      await api.put(`/invoices/${inv.id}`, { status });
      setSelected(s => s && s.id === inv.id ? { ...s, status } : s);
      load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const downloadPDF = async (invoiceNumber) => {
    try {
      const url = await api.pdf(`/invoices/${invoiceNumber}/pdf`);
      window.open(url, '_blank');
    } catch (e) { setError(e.message); }
  };

  const openPayment = (inv) => {
    setPayForm({ invoice_id: inv.id, amount: inv.total_amount - inv.amount_paid, payment_method: 'bank_transfer', reference: '', notes: '' });
  };

  const recordPayment = async () => {
    setSaving(true);
    try {
      await api.post(`/invoices/${payForm.invoice_id}/payments`, {
        amount: parseFloat(payForm.amount),
        payment_method: payForm.payment_method,
        reference: payForm.reference || null,
        notes: payForm.notes || null,
      });
      const id = payForm.invoice_id;
      setPayForm(null);
      load();
      setSelected(await api.get(`/invoices/${id}`));
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const filtered = search
    ? (invoices || []).filter(i =>
        i.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
        i.customers?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : (invoices || []);

  return (
    <div className="im-page">
      <div className="im-page-header">
        <div>
          <h1 className="im-page-title">Invoices</h1>
          <p className="im-page-sub">{invoices === null ? 'Loading…' : `${filtered.length} invoices`}</p>
        </div>
      </div>

      {error && <div className="im-error" onClick={() => setError(null)}>{error} ✕</div>}

      <div className="im-tabs">
        {STATUS_TABS.map(t => (
          <button key={t} className={`im-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="im-toolbar">
        <input className="im-search" placeholder="Search by invoice number or customer…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="im-split-layout">
        <div className="im-split-list">
          <div className="im-panel">
            {invoices === null ? (
              Array(5).fill(0).map((_, i) => (
                <div key={i} className="im-list-row">
                  <div className="im-skeleton" style={{ height: 14, width: '50%', marginBottom: 6 }} />
                  <div className="im-skeleton" style={{ height: 11, width: '70%' }} />
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No invoices found
              </div>
            ) : filtered.map(inv => (
              <div key={inv.id}
                className={`im-list-row ${selected?.id === inv.id ? 'active' : ''}`}
                onClick={() => open(inv)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="im-mono" style={{ fontSize: 13, fontWeight: 700 }}>{inv.invoice_number}</span>
                  <span className={`im-status-badge ${STATUS_CLS[inv.status] || 'muted'}`}>{inv.status}</span>
                </div>
                <div className="im-list-sub">
                  {inv.customers?.name} · {fmtDoc(inv.total_amount, inv)} · Due {inv.due_date}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="im-split-detail">
          {!selected ? (
            <div className="im-panel im-panel-empty">Select an invoice to view details</div>
          ) : (
            <div className="im-panel">
              <div className="im-detail-header">
                <div>
                  <h2 className="im-detail-title">{selected.invoice_number}</h2>
                  <div className="im-detail-sub">{selected.customers?.name}</div>
                </div>
                <div className="im-row-actions">
                  <button className="im-btn-ghost" onClick={() => downloadPDF(selected.invoice_number)}>
                    ↓ PDF
                  </button>
                  {selected.status === 'draft' && (
                    <button className="im-btn-primary" disabled={saving} onClick={() => setStatus(selected, 'sent')}>
                      Mark as sent
                    </button>
                  )}
                  {selected.status !== 'paid' && selected.status !== 'void' && (
                    <button className={selected.status === 'draft' ? 'im-btn-ghost' : 'im-btn-primary'} onClick={() => openPayment(selected)}>
                      Record payment
                    </button>
                  )}
                  {selected.status !== 'paid' && selected.status !== 'void' && Number(selected.amount_paid) === 0 && (
                    <button className="im-btn-ghost red" disabled={saving} onClick={() => setStatus(selected, 'void')}>
                      Void
                    </button>
                  )}
                </div>
              </div>

              <div className="im-detail-grid">
                <div className="im-detail-field"><span>Status</span>
                  <span className={`im-status-badge ${STATUS_CLS[selected.status]}`}>{selected.status}</span>
                </div>
                {selected.sales_orders?.order_number && (
                  <div className="im-detail-field"><span>Sales order</span>
                    <strong className="im-mono">{selected.sales_orders.order_number}</strong>
                  </div>
                )}
                <div className="im-detail-field"><span>Invoice date</span><strong>{selected.invoice_date}</strong></div>
                <div className="im-detail-field"><span>Due date</span>
                  <strong style={{ color: selected.status === 'overdue' ? 'var(--red)' : 'inherit' }}>
                    {selected.due_date}
                  </strong>
                </div>
                <div className="im-detail-field"><span>Total</span><strong>{fmtDoc(selected.total_amount, selected)}</strong></div>
                <div className="im-detail-field"><span>Paid</span><strong style={{ color: 'var(--green)' }}>{fmtDoc(selected.amount_paid, selected)}</strong></div>
                <div className="im-detail-field"><span>Balance due</span>
                  <strong style={{ color: selected.total_amount - selected.amount_paid > 0 ? 'var(--orange)' : 'var(--green)' }}>
                    {fmtDoc(selected.total_amount - selected.amount_paid, selected)}
                  </strong>
                </div>
              </div>

              {selected.payments?.length > 0 && (
                <>
                  <div className="im-detail-section-title">Payments</div>
                  <table className="im-table">
                    <thead><tr><th>Date</th><th>Method</th><th>Reference</th><th className="num">Amount</th></tr></thead>
                    <tbody>
                      {selected.payments.map(p => (
                        <tr key={p.id}>
                          <td>{p.paid_at}</td>
                          <td>{(p.payment_method || '—').replace('_', ' ')}</td>
                          <td>{p.reference || '—'}</td>
                          <td className="num">{fmtDoc(p.amount, selected)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {selected.invoice_items?.length > 0 && (
                <>
                  <div className="im-detail-section-title">Line items</div>
                  <table className="im-table">
                    <thead><tr><th>Description</th><th className="num">Qty</th><th className="num">Unit price</th><th className="num">Total</th></tr></thead>
                    <tbody>
                      {selected.invoice_items.map((item, i) => (
                        <tr key={i}>
                          <td>{item.description}</td>
                          <td className="num">{item.qty}</td>
                          <td className="num">{fmtDoc(item.unit_price, selected)}</td>
                          <td className="num">{fmtDoc(item.line_total, selected)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                      Subtotal: {fmtDoc(selected.subtotal, selected)} · VAT ({selected.tax_rate}%): {fmtDoc(selected.tax_amount, selected)}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>Total: {fmtDoc(selected.total_amount, selected)}</div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Record payment modal */}
      {payForm && (
        <div className="im-modal-overlay" onClick={() => setPayForm(null)}>
          <div className="im-modal" onClick={e => e.stopPropagation()}>
            <div className="im-modal-header">
              <h2>Record payment</h2>
              <button className="im-modal-close" onClick={() => setPayForm(null)}>✕</button>
            </div>
            <div className="im-modal-body">
              <div className="im-form-grid">
                <div className="im-field span-2">
                  <label>Amount *</label>
                  <input type="number" value={payForm.amount}
                    onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div className="im-field">
                  <label>Payment method</label>
                  <select value={payForm.payment_method}
                    onChange={e => setPayForm(f => ({ ...f, payment_method: e.target.value }))}>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="promptpay">PromptPay</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                  </select>
                </div>
                <div className="im-field">
                  <label>Reference</label>
                  <input value={payForm.reference} placeholder="Bank ref, transaction ID…"
                    onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))} />
                </div>
                <div className="im-field span-2">
                  <label>Notes</label>
                  <input value={payForm.notes}
                    onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="im-modal-footer">
              <button className="im-btn-ghost" onClick={() => setPayForm(null)}>Cancel</button>
              <button className="im-btn-primary" onClick={recordPayment} disabled={saving}>
                {saving ? 'Saving…' : 'Record payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}