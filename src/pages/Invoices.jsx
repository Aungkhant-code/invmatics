/**
 * pages/Invoices.jsx — Invoice management
 * Real data from /api/invoices
 */

import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../lib/api';

function fmt(n) {
  if (n == null) return '—';
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_TABS = ['all', 'draft', 'sent', 'paid', 'overdue'];

const STATUS_CLS = {
  draft: 'muted', sent: 'info', paid: 'ok', overdue: 'out', void: 'out',
};

export default function Invoices() {
  const api = useApi();

  const [invoices, setInvoices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tab,      setTab]      = useState('all');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [search,   setSearch]   = useState('');
  const [payForm,  setPayForm]  = useState(null);
  const [saving,   setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = tab !== 'all' ? `?status=${tab}` : '';
      const data = await api.get(`/invoices${params}`);
      setInvoices(data.invoices || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [api, tab]);

  useEffect(() => { load(); }, [load]);

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
      setPayForm(null);
      load();
      if (selected?.id === payForm.invoice_id) {
        const detail = await api.get(`/invoices/${payForm.invoice_id}`);
        setSelected(detail);
      }
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const filtered = search
    ? invoices.filter(i =>
        i.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
        i.customers?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : invoices;

  return (
    <div className="im-page">
      <div className="im-page-header">
        <div>
          <h1 className="im-page-title">Invoices</h1>
          <p className="im-page-sub">{filtered.length} invoices</p>
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
            {loading ? (
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
                onClick={() => setSelected(inv)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="im-mono" style={{ fontSize: 13, fontWeight: 700 }}>{inv.invoice_number}</span>
                  <span className={`im-status-badge ${STATUS_CLS[inv.status] || 'muted'}`}>{inv.status}</span>
                </div>
                <div className="im-list-sub">
                  {inv.customers?.name} · {fmt(inv.total_amount)} · Due {inv.due_date}
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
                  {selected.status !== 'paid' && selected.status !== 'void' && (
                    <button className="im-btn-primary" onClick={() => openPayment(selected)}>
                      Record payment
                    </button>
                  )}
                </div>
              </div>

              <div className="im-detail-grid">
                <div className="im-detail-field"><span>Status</span>
                  <span className={`im-status-badge ${STATUS_CLS[selected.status]}`}>{selected.status}</span>
                </div>
                <div className="im-detail-field"><span>Invoice date</span><strong>{selected.invoice_date}</strong></div>
                <div className="im-detail-field"><span>Due date</span>
                  <strong style={{ color: selected.status === 'overdue' ? 'var(--red)' : 'inherit' }}>
                    {selected.due_date}
                  </strong>
                </div>
                <div className="im-detail-field"><span>Total</span><strong>{fmt(selected.total_amount)}</strong></div>
                <div className="im-detail-field"><span>Paid</span><strong style={{ color: 'var(--green)' }}>{fmt(selected.amount_paid)}</strong></div>
                <div className="im-detail-field"><span>Balance due</span>
                  <strong style={{ color: selected.total_amount - selected.amount_paid > 0 ? 'var(--orange)' : 'var(--green)' }}>
                    {fmt(selected.total_amount - selected.amount_paid)}
                  </strong>
                </div>
              </div>

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
                          <td className="num">{fmt(item.unit_price)}</td>
                          <td className="num">{fmt(item.line_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                      Subtotal: {fmt(selected.subtotal)} · VAT ({selected.tax_rate}%): {fmt(selected.tax_amount)}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>Total: {fmt(selected.total_amount)}</div>
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