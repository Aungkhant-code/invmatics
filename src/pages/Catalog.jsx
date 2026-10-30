/**
 * pages/Catalog.jsx — Product catalogue
 * Real data from /api/products
 */

import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../lib/api';

function fmt(n) {
  if (n == null) return '—';
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const EMPTY_FORM = {
  name: '', sku: '', unit: 'unit', description: '',
  cost_price: '', selling_price: '', reorder_point: '', reorder_qty: '',
};

export default function Catalog() {
  const api = useApi();
  const [products, setProducts]   = useState([]);
  const [loading,  setLoading]    = useState(true);
  const [search,   setSearch]     = useState('');
  const [showModal,setShowModal]  = useState(false);
  const [form,     setForm]       = useState(EMPTY_FORM);
  const [saving,   setSaving]     = useState(false);
  const [error,    setError]      = useState(null);
  const [editId,   setEditId]     = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get(`/products${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      setProducts(data.products || []);
      setError(null);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [api, search]);

  useEffect(() => {
    // load() only sets state after the network await, never synchronously
    (async () => { await load(); })();
  }, [load]);

  const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setShowModal(true); };
  const openEdit = (p) => {
    setForm({
      name: p.name, sku: p.sku, unit: p.unit || 'unit',
      description: p.description || '',
      cost_price: p.cost_price, selling_price: p.selling_price,
      reorder_point: p.reorder_point, reorder_qty: p.reorder_qty,
    });
    setEditId(p.id);
    setShowModal(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        ...form,
        cost_price:    parseFloat(form.cost_price)    || 0,
        selling_price: parseFloat(form.selling_price) || 0,
        reorder_point: parseInt(form.reorder_point)   || 0,
        reorder_qty:   parseInt(form.reorder_qty)     || 0,
      };
      if (editId) {
        await api.put(`/products/${editId}`, body);
      } else {
        await api.post('/products', body);
      }
      setShowModal(false);
      load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const deactivate = async (id) => {
    if (!confirm('Deactivate this product?')) return;
    await api.delete(`/products/${id}`);
    load();
  };

  return (
    <div className="im-page">

      {/* Header */}
      <div className="im-page-header">
        <div>
          <h1 className="im-page-title">Product Catalogue</h1>
          <p className="im-page-sub">{products.length} products</p>
        </div>
        <button className="im-btn-primary" onClick={openAdd}>+ Add product</button>
      </div>

      {error && <div className="im-error">{error}</div>}

      {/* Search */}
      <div className="im-toolbar">
        <input
          className="im-search"
          placeholder="Search by name or SKU…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="im-panel">
        <div className="im-table-wrap">
          <table className="im-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Unit</th>
                <th className="num">Cost</th>
                <th className="num">Price</th>
                <th className="num">On hand</th>
                <th className="num">Reorder</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    {Array(9).fill(0).map((_, j) => (
                      <td key={j}><div className="im-skeleton" style={{ height: 13, width: '80%' }} /></td>
                    ))}
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                  No products yet — add your first product
                </td></tr>
              ) : products.map(p => {
                const qty = p.stock_levels?.qty_on_hand ?? 0;
                const isLow = qty <= p.reorder_point;
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="im-td-primary">{p.name}</div>
                      {p.description && <div className="im-td-sub">{p.description}</div>}
                    </td>
                    <td><span className="im-mono">{p.sku}</span></td>
                    <td>{p.unit}</td>
                    <td className="num">{fmt(p.cost_price)}</td>
                    <td className="num">{fmt(p.selling_price)}</td>
                    <td className="num">
                      <span style={{ color: isLow ? 'var(--red)' : 'var(--text-primary)', fontWeight: 700 }}>
                        {qty}
                      </span>
                    </td>
                    <td className="num">{p.reorder_point}</td>
                    <td>
                      {isLow
                        ? <span className="im-status-badge warn">Low stock</span>
                        : <span className="im-status-badge ok">In stock</span>
                      }
                    </td>
                    <td>
                      <div className="im-row-actions">
                        <button className="im-btn-ghost" onClick={() => openEdit(p)}>Edit</button>
                        <button className="im-btn-ghost red" onClick={() => deactivate(p.id)}>Remove</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit modal */}
      {showModal && (
        <div className="im-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="im-modal" onClick={e => e.stopPropagation()}>
            <div className="im-modal-header">
              <h2>{editId ? 'Edit product' : 'Add product'}</h2>
              <button className="im-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="im-modal-body">
              <div className="im-form-grid">
                <div className="im-field span-2">
                  <label>Product name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="im-field">
                  <label>SKU *</label>
                  <input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
                </div>
                <div className="im-field">
                  <label>Unit</label>
                  <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                    {['unit','roll','box','kg','m','l','set','pair'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div className="im-field">
                  <label>Cost price</label>
                  <input type="number" value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))} />
                </div>
                <div className="im-field">
                  <label>Selling price</label>
                  <input type="number" value={form.selling_price} onChange={e => setForm(f => ({ ...f, selling_price: e.target.value }))} />
                </div>
                <div className="im-field">
                  <label>Reorder point</label>
                  <input type="number" value={form.reorder_point} onChange={e => setForm(f => ({ ...f, reorder_point: e.target.value }))} />
                </div>
                <div className="im-field">
                  <label>Reorder qty</label>
                  <input type="number" value={form.reorder_qty} onChange={e => setForm(f => ({ ...f, reorder_qty: e.target.value }))} />
                </div>
                <div className="im-field span-2">
                  <label>Description</label>
                  <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="im-modal-footer">
              <button className="im-btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="im-btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : editId ? 'Save changes' : 'Add product'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}