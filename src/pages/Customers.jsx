/**
 * pages/Customers.jsx — Customer management
 * Real data from /api/customers
 */

import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../lib/api';
import { fmt } from '../lib/money';

const EMPTY_FORM = {
  name: '', contact_name: '', email: '', phone: '',
  address: '', tax_id: '', credit_limit: '', payment_terms: '14',
};

const ORDER_STATUS_CLS = {
  draft: 'muted', confirmed: 'info', dispatched: 'blue',
  delivered: 'ok', cancelled: 'out',
};

export default function Customers() {
  const api = useApi();

  const [customers, setCustomers] = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search,    setSearch]    = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [editId,    setEditId]    = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get(`/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      setCustomers(data.customers || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [api, search]);

  useEffect(() => { load(); }, [load]);

  const selectCustomer = async (c) => {
    setSelected(c);
    setDetailLoading(true);
    try {
      const detail = await api.get(`/customers/${c.id}`);
      setSelected(detail);
    } catch (e) { setError(e.message); }
    finally { setDetailLoading(false); }
  };

  const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setShowModal(true); };
  const openEdit = (c) => {
    setForm({
      name: c.name, contact_name: c.contact_name || '',
      email: c.email || '', phone: c.phone || '',
      address: c.address || '', tax_id: c.tax_id || '',
      credit_limit: c.credit_limit || '', payment_terms: c.payment_terms || 14,
    });
    setEditId(c.id);
    setShowModal(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form, credit_limit: parseFloat(form.credit_limit) || 0, payment_terms: parseInt(form.payment_terms) || 14 };
      if (editId) await api.put(`/customers/${editId}`, body);
      else await api.post('/customers', body);
      setShowModal(false);
      load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const deactivate = async (id) => {
    if (!confirm('Deactivate this customer?')) return;
    await api.delete(`/customers/${id}`);
    if (selected?.id === id) setSelected(null);
    load();
  };

  return (
    <div className="im-page">
      <div className="im-page-header">
        <div>
          <h1 className="im-page-title">Customers</h1>
          <p className="im-page-sub">{customers.length} customers</p>
        </div>
        <button className="im-btn-primary" onClick={openAdd}>+ Add customer</button>
      </div>

      {error && <div className="im-error">{error}</div>}

      <div className="im-split-layout">
        {/* List */}
        <div className="im-split-list">
          <div className="im-toolbar">
            <input className="im-search" placeholder="Search customers…" value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="im-panel">
            {loading ? (
              Array(6).fill(0).map((_, i) => (
                <div key={i} className="im-list-row">
                  <div className="im-skeleton" style={{ height: 14, width: '60%', marginBottom: 6 }} />
                  <div className="im-skeleton" style={{ height: 11, width: '40%' }} />
                </div>
              ))
            ) : customers.map(c => (
              <div key={c.id}
                className={`im-list-row ${selected?.id === c.id ? 'active' : ''}`}
                onClick={() => selectCustomer(c)}
              >
                <div className="im-list-primary">{c.name}</div>
                <div className="im-list-sub">
                  {c.contact_name && `${c.contact_name} · `}
                  <span style={{ color: c.outstanding_balance > 0 ? 'var(--orange)' : 'var(--text-muted)' }}>
                    {fmt(c.outstanding_balance)} outstanding
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="im-split-detail">
          {!selected ? (
            <div className="im-panel im-panel-empty">Select a customer to view details</div>
          ) : detailLoading ? (
            <div className="im-panel" style={{ padding: 24 }}>
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="im-skeleton" style={{ height: 14, width: `${60 + i * 10}%`, marginBottom: 12 }} />
              ))}
            </div>
          ) : (
            <div className="im-panel">
              <div className="im-detail-header">
                <div>
                  <h2 className="im-detail-title">{selected.name}</h2>
                  {selected.tax_id && <div className="im-detail-sub">Tax ID: {selected.tax_id}</div>}
                </div>
                <div className="im-row-actions">
                  <button className="im-btn-ghost" onClick={() => openEdit(selected)}>Edit</button>
                  <button className="im-btn-ghost red" onClick={() => deactivate(selected.id)}>Remove</button>
                </div>
              </div>

              {/* Info grid */}
              <div className="im-detail-grid">
                {selected.contact_name && <div className="im-detail-field"><span>Contact</span><strong>{selected.contact_name}</strong></div>}
                {selected.email        && <div className="im-detail-field"><span>Email</span><strong>{selected.email}</strong></div>}
                {selected.phone        && <div className="im-detail-field"><span>Phone</span><strong>{selected.phone}</strong></div>}
                {selected.address      && <div className="im-detail-field"><span>Address</span><strong>{selected.address}</strong></div>}
                <div className="im-detail-field"><span>Payment terms</span><strong>Net {selected.payment_terms}</strong></div>
                <div className="im-detail-field"><span>Credit limit</span><strong>{fmt(selected.credit_limit)}</strong></div>
                <div className="im-detail-field">
                  <span>Outstanding</span>
                  <strong style={{ color: selected.outstanding_balance > 0 ? 'var(--orange)' : 'var(--green)' }}>
                    {fmt(selected.outstanding_balance)}
                  </strong>
                </div>
                <div className="im-detail-field"><span>Total orders</span><strong>{selected.total_orders ?? 0}</strong></div>
              </div>

              {/* Recent orders */}
              {selected.recent_orders?.length > 0 && (
                <>
                  <div className="im-detail-section-title">Recent orders</div>
                  <table className="im-table">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Date</th>
                        <th className="num">Total</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.recent_orders.map(o => (
                        <tr key={o.id}>
                          <td><span className="im-mono">{o.order_number}</span></td>
                          <td>{o.order_date}</td>
                          <td className="num">{fmt(o.total_amount)}</td>
                          <td><span className={`im-status-badge ${ORDER_STATUS_CLS[o.status] || 'muted'}`}>{o.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="im-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="im-modal" onClick={e => e.stopPropagation()}>
            <div className="im-modal-header">
              <h2>{editId ? 'Edit customer' : 'Add customer'}</h2>
              <button className="im-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="im-modal-body">
              <div className="im-form-grid">
                <div className="im-field span-2">
                  <label>Company name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="im-field"><label>Contact name</label><input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} /></div>
                <div className="im-field"><label>Email</label><input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div className="im-field"><label>Phone</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div className="im-field"><label>Tax ID</label><input value={form.tax_id} onChange={e => setForm(f => ({ ...f, tax_id: e.target.value }))} /></div>
                <div className="im-field span-2"><label>Address</label><input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
                <div className="im-field"><label>Credit limit</label><input type="number" value={form.credit_limit} onChange={e => setForm(f => ({ ...f, credit_limit: e.target.value }))} /></div>
                <div className="im-field"><label>Payment terms (days)</label><input type="number" value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))} /></div>
              </div>
            </div>
            <div className="im-modal-footer">
              <button className="im-btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="im-btn-primary" onClick={save} disabled={saving || !form.name}>
                {saving ? 'Saving…' : editId ? 'Save changes' : 'Add customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}