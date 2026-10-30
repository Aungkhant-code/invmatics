/**
 * pages/Suppliers.jsx — Supplier management
 * Real data from /api/suppliers
 */

import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../lib/api';

function fmt(n) {
  if (n == null) return '—';
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const EMPTY_FORM = {
  name: '', contact_name: '', email: '', phone: '',
  address: '', tax_id: '', lead_days: '7', payment_terms: '30',
};

const PO_STATUS_CLS = {
  draft: 'muted', sent: 'info', partial: 'warn',
  received: 'ok', cancelled: 'out',
};

export default function Suppliers() {
  const api = useApi();

  const [suppliers, setSuppliers] = useState([]);
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
      const data = await api.get(`/suppliers${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      setSuppliers(data.suppliers || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [api, search]);

  useEffect(() => { load(); }, [load]);

  const selectSupplier = async (s) => {
    setSelected(s);
    setDetailLoading(true);
    try {
      const detail = await api.get(`/suppliers/${s.id}`);
      setSelected(detail);
    } catch (e) { setError(e.message); }
    finally { setDetailLoading(false); }
  };

  const openAdd  = () => { setForm(EMPTY_FORM); setEditId(null); setShowModal(true); };
  const openEdit = (s) => {
    setForm({
      name: s.name, contact_name: s.contact_name || '',
      email: s.email || '', phone: s.phone || '',
      address: s.address || '', tax_id: s.tax_id || '',
      lead_days: s.lead_days || 7, payment_terms: s.payment_terms || 30,
    });
    setEditId(s.id);
    setShowModal(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form, lead_days: parseInt(form.lead_days) || 7, payment_terms: parseInt(form.payment_terms) || 30 };
      if (editId) await api.put(`/suppliers/${editId}`, body);
      else await api.post('/suppliers', body);
      setShowModal(false);
      load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const deactivate = async (id) => {
    if (!confirm('Deactivate this supplier?')) return;
    await api.delete(`/suppliers/${id}`);
    if (selected?.id === id) setSelected(null);
    load();
  };

  return (
    <div className="im-page">
      <div className="im-page-header">
        <div>
          <h1 className="im-page-title">Suppliers</h1>
          <p className="im-page-sub">{suppliers.length} suppliers</p>
        </div>
        <button className="im-btn-primary" onClick={openAdd}>+ Add supplier</button>
      </div>

      {error && <div className="im-error">{error}</div>}

      <div className="im-split-layout">
        <div className="im-split-list">
          <div className="im-toolbar">
            <input className="im-search" placeholder="Search suppliers…" value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="im-panel">
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <div key={i} className="im-list-row">
                  <div className="im-skeleton" style={{ height: 14, width: '55%', marginBottom: 6 }} />
                  <div className="im-skeleton" style={{ height: 11, width: '35%' }} />
                </div>
              ))
            ) : suppliers.map(s => (
              <div key={s.id}
                className={`im-list-row ${selected?.id === s.id ? 'active' : ''}`}
                onClick={() => selectSupplier(s)}
              >
                <div className="im-list-primary">{s.name}</div>
                <div className="im-list-sub">
                  Lead: {s.lead_days}d · Net {s.payment_terms}
                  {s.outstanding_payable > 0 && (
                    <span style={{ color: 'var(--orange)' }}> · {fmt(s.outstanding_payable)} owing</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="im-split-detail">
          {!selected ? (
            <div className="im-panel im-panel-empty">Select a supplier to view details</div>
          ) : detailLoading ? (
            <div className="im-panel" style={{ padding: 24 }}>
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="im-skeleton" style={{ height: 14, width: `${55 + i * 10}%`, marginBottom: 12 }} />
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

              <div className="im-detail-grid">
                {selected.contact_name && <div className="im-detail-field"><span>Contact</span><strong>{selected.contact_name}</strong></div>}
                {selected.email        && <div className="im-detail-field"><span>Email</span><strong>{selected.email}</strong></div>}
                {selected.phone        && <div className="im-detail-field"><span>Phone</span><strong>{selected.phone}</strong></div>}
                <div className="im-detail-field"><span>Lead time</span><strong>{selected.lead_days} days</strong></div>
                <div className="im-detail-field"><span>Payment terms</span><strong>Net {selected.payment_terms}</strong></div>
                <div className="im-detail-field"><span>Outstanding payable</span>
                  <strong style={{ color: selected.outstanding_payable > 0 ? 'var(--orange)' : 'var(--green)' }}>
                    {fmt(selected.outstanding_payable)}
                  </strong>
                </div>
                <div className="im-detail-field"><span>Total spend</span><strong>{fmt(selected.total_spend)}</strong></div>
                <div className="im-detail-field"><span>Total POs</span><strong>{selected.total_pos ?? 0}</strong></div>
              </div>

              {selected.products?.length > 0 && (
                <>
                  <div className="im-detail-section-title">Products supplied</div>
                  <table className="im-table">
                    <thead><tr><th>Product</th><th>SKU</th><th className="num">Cost</th><th className="num">Price</th></tr></thead>
                    <tbody>
                      {selected.products.map(p => (
                        <tr key={p.id}>
                          <td>{p.name}</td>
                          <td><span className="im-mono">{p.sku}</span></td>
                          <td className="num">{fmt(p.cost_price)}</td>
                          <td className="num">{fmt(p.selling_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {selected.recent_pos?.length > 0 && (
                <>
                  <div className="im-detail-section-title">Recent purchase orders</div>
                  <table className="im-table">
                    <thead><tr><th>PO</th><th>Date</th><th className="num">Total</th><th>Status</th></tr></thead>
                    <tbody>
                      {selected.recent_pos.map(po => (
                        <tr key={po.po_number}>
                          <td><span className="im-mono">{po.po_number}</span></td>
                          <td>{po.order_date}</td>
                          <td className="num">{fmt(po.total_amount)}</td>
                          <td><span className={`im-status-badge ${PO_STATUS_CLS[po.status] || 'muted'}`}>{po.status}</span></td>
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

      {showModal && (
        <div className="im-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="im-modal" onClick={e => e.stopPropagation()}>
            <div className="im-modal-header">
              <h2>{editId ? 'Edit supplier' : 'Add supplier'}</h2>
              <button className="im-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="im-modal-body">
              <div className="im-form-grid">
                <div className="im-field span-2"><label>Company name *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="im-field"><label>Contact name</label><input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} /></div>
                <div className="im-field"><label>Email</label><input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div className="im-field"><label>Phone</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div className="im-field"><label>Tax ID</label><input value={form.tax_id} onChange={e => setForm(f => ({ ...f, tax_id: e.target.value }))} /></div>
                <div className="im-field span-2"><label>Address</label><input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
                <div className="im-field"><label>Lead days</label><input type="number" value={form.lead_days} onChange={e => setForm(f => ({ ...f, lead_days: e.target.value }))} /></div>
                <div className="im-field"><label>Payment terms (days)</label><input type="number" value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))} /></div>
              </div>
            </div>
            <div className="im-modal-footer">
              <button className="im-btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="im-btn-primary" onClick={save} disabled={saving || !form.name}>
                {saving ? 'Saving…' : editId ? 'Save changes' : 'Add supplier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}