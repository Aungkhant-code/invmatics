/**
 * pages/Delivery.jsx — Delivery orders, proof of delivery, document downloads.
 * Real data from /api/delivery-orders. Phone-friendly: the "Proof of delivery" form
 * takes photos straight from the camera.
 */

import { useState, useEffect } from 'react';
import { useApi } from '../lib/api';

const STATUS_TABS = ['all', 'pending', 'dispatched', 'delivered', 'cancelled'];
const STATUS_CLS = { pending: 'muted', dispatched: 'info', delivered: 'ok', confirmed: 'ok', cancelled: 'out' };
const MAX_PHOTOS = 4;

// Resize + re-encode a photo in the browser so uploads stay small (~100-300 KB).
function shrink(file, max = 1280) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      let q = 0.8, out = c.toDataURL('image/jpeg', q);
      while (out.length > 560000 && q > 0.35) { q -= 0.1; out = c.toDataURL('image/jpeg', q); }
      resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file isn\'t an image')); };
    img.src = url;
  });
}

export default function Delivery() {
  const api = useApi();
  const [list, setList] = useState(null);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [proof, setProof] = useState(null);
  const [edit, setEdit] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const load = () => setReloadKey(k => k + 1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get(`/delivery-orders${tab !== 'all' ? `?status=${tab}` : ''}`);
        if (cancelled) return;
        setList(data.delivery_orders || []);
        setError(null);
      } catch (e) { if (!cancelled) setError(e.message); }
    })();
    return () => { cancelled = true; };
  }, [api, tab, reloadKey]);

  const open = async (d) => {
    setSelected(d);
    try { setSelected(await api.get(`/delivery-orders/${d.id}`)); }
    catch (e) { setError(e.message); }
  };

  const refreshSelected = async (id) => {
    load();
    try { setSelected(await api.get(`/delivery-orders/${id}`)); } catch { /* list reload will show it */ }
  };

  const download = async (path) => {
    try { window.open(await api.pdf(path), '_blank'); }
    catch (e) { setError(e.message); }
  };

  const setStatus = async (d, status) => {
    if (status === 'cancelled' && !confirm(`Cancel delivery ${d.do_number}?`)) return;
    setSaving(true);
    try { await api.put(`/delivery-orders/${d.id}`, { status }); await refreshSelected(d.id); }
    catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const startProof = (d) => setProof({
    id: d.id, received_by: '', notes: '', photos: [],
    items: (d.delivery_order_items || []).map(i => ({
      item_id: i.id, description: i.description, ordered: i.qty_delivered || i.qty_ordered,
      qty_received: i.qty_delivered || i.qty_ordered, condition: 'Good',
    })),
  });

  const startEdit = (d) => setEdit({
    id: d.id, driver_name: d.driver_name || '', driver_phone: d.driver_phone || '',
    vehicle_no: d.vehicle_no || '', delivery_date: d.delivery_date || '',
    items: (d.delivery_order_items || []).map(i => ({
      id: i.id, description: i.description, ordered: i.qty_ordered,
      qty: i.qty_delivered || i.qty_ordered,
    })),
  });

  const saveEdit = async () => {
    setSaving(true);
    try {
      await api.put(`/delivery-orders/${edit.id}`, {
        driver_name: edit.driver_name || null,
        driver_phone: edit.driver_phone || null,
        vehicle_no: edit.vehicle_no || null,
        delivery_date: edit.delivery_date || null,
        items: edit.items.map(i => ({ id: i.id, qty_delivered: Number(i.qty) })),
      });
      const id = edit.id;
      setEdit(null);
      await refreshSelected(id);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const addPhotos = async (files) => {
    try {
      const room = MAX_PHOTOS - proof.photos.length;
      const added = await Promise.all([...files].slice(0, room).map(f => shrink(f)));
      setProof(p => ({ ...p, photos: [...p.photos, ...added] }));
    } catch (e) { setError(e.message); }
  };

  const submitProof = async () => {
    setSaving(true);
    try {
      await api.post(`/delivery-orders/${proof.id}/proof`, {
        received_by: proof.received_by || null,
        notes: proof.notes || null,
        photos: proof.photos,
        items: proof.items.map(({ item_id, qty_received, condition }) => ({ item_id, qty_received: Number(qty_received), condition })),
      });
      const id = proof.id;
      setProof(null);
      await refreshSelected(id);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const q = search.trim().toLowerCase();
  const filtered = (list || []).filter(d =>
    !q || d.do_number?.toLowerCase().includes(q) || d.customers?.name?.toLowerCase().includes(q) || d.driver_name?.toLowerCase().includes(q));
  const dc = selected?.delivery_confirmations?.[0];
  const canProve = selected && ['pending', 'dispatched'].includes(selected.status) && !dc;

  return (
    <div className="im-page">
      <div className="im-page-header">
        <div>
          <h1 className="im-page-title">Delivery</h1>
          <p className="im-page-sub">{list === null ? 'Loading…' : `${filtered.length} deliveries`}</p>
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
        <input className="im-search" placeholder="Search by delivery number, customer or driver…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="im-split-layout">
        <div className="im-split-list">
          <div className="im-panel">
            {list === null ? Array(5).fill(0).map((_, i) => (
              <div key={i} className="im-list-row">
                <div className="im-skeleton" style={{ height: 14, width: '50%', marginBottom: 6 }} />
                <div className="im-skeleton" style={{ height: 11, width: '70%' }} />
              </div>
            )) : filtered.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No deliveries yet — open a sales order and choose “Create delivery order”.
              </div>
            ) : filtered.map(d => (
              <div key={d.id} className={`im-list-row ${selected?.id === d.id ? 'active' : ''}`} onClick={() => open(d)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="im-mono" style={{ fontSize: 13, fontWeight: 700 }}>{d.do_number}</span>
                  <span className={`im-status-badge ${STATUS_CLS[d.status] || 'muted'}`}>{d.status}</span>
                </div>
                <div className="im-list-sub">
                  {d.customers?.name} · {d.delivery_date || 'No date'}{d.driver_name ? ` · ${d.driver_name}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="im-split-detail">
          {!selected ? (
            <div className="im-panel im-panel-empty">Select a delivery to view details</div>
          ) : (
            <div className="im-panel">
              <div className="im-detail-header">
                <div>
                  <h2 className="im-detail-title">{selected.do_number}</h2>
                  <div className="im-detail-sub">{selected.customers?.name}</div>
                </div>
                <div className="im-row-actions">
                  <button className="im-btn-ghost" onClick={() => download(`/delivery-orders/${selected.do_number}/pdf`)}>↓ Delivery order</button>
                  {dc && <button className="im-btn-ghost" onClick={() => download(`/delivery-confirmations/${dc.dc_number}/pdf`)}>↓ Confirmation</button>}
                  {canProve && <button className="im-btn-ghost" onClick={() => startEdit(selected)}>Assign driver &amp; qty</button>}
                  {selected.status === 'pending' && (
                    <button className="im-btn-ghost" disabled={saving} onClick={() => setStatus(selected, 'dispatched')}>Out for delivery</button>
                  )}
                  {canProve && <button className="im-btn-primary" onClick={() => startProof(selected)}>Proof of delivery</button>}
                  {['pending', 'dispatched'].includes(selected.status) && !dc && (
                    <button className="im-btn-ghost red" disabled={saving} onClick={() => setStatus(selected, 'cancelled')}>Cancel</button>
                  )}
                </div>
              </div>

              <div className="im-detail-grid">
                <div className="im-detail-field"><span>Status</span>
                  <span className={`im-status-badge ${STATUS_CLS[selected.status]}`}>{selected.status}</span></div>
                {selected.sales_orders?.order_number && (
                  <div className="im-detail-field"><span>Sales order</span><strong className="im-mono">{selected.sales_orders.order_number}</strong></div>
                )}
                <div className="im-detail-field"><span>Delivery date</span><strong>{selected.delivery_date || '—'}</strong></div>
                <div className="im-detail-field"><span>Driver</span><strong>{selected.driver_name || '—'}{selected.driver_phone ? ` · ${selected.driver_phone}` : ''}</strong></div>
                <div className="im-detail-field"><span>Vehicle</span><strong>{selected.vehicle_no || '—'}</strong></div>
                <div className="im-detail-field"><span>Address</span><strong>{selected.delivery_address || selected.customers?.address || '—'}</strong></div>
              </div>

              <div className="im-detail-section-title">Items</div>
              <table className="im-table">
                <thead><tr><th>Description</th><th className="num">Ordered</th><th className="num">{dc ? 'Delivered' : 'To deliver'}</th></tr></thead>
                <tbody>
                  {(selected.delivery_order_items || []).map(i => (
                    <tr key={i.id || i.description}><td>{i.description}</td><td className="num">{i.qty_ordered}</td><td className="num">{i.qty_delivered}</td></tr>
                  ))}
                </tbody>
              </table>

              {dc && (
                <>
                  <div className="im-detail-section-title">Proof of delivery</div>
                  <div style={{ padding: '0 16px 8px', fontSize: 13, color: 'var(--text-muted)' }}>
                    {dc.dc_number} · received by {dc.confirmed_by_name || '—'} · {(dc.confirmed_at || '').slice(0, 16).replace('T', ' ')}
                    {dc.notes ? <div style={{ marginTop: 4 }}>{dc.notes}</div> : null}
                  </div>
                  {(dc.photo_urls || []).length > 0 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '0 16px 16px' }}>
                      {dc.photo_urls.map((src, i) => (
                        <a key={i} href={src} download={`${dc.dc_number}-${i + 1}.jpg`} title="Download photo">
                          <img src={src} alt={`Proof ${i + 1}`} style={{ height: 96, borderRadius: 8, border: '1px solid var(--border)' }} />
                        </a>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {edit && (
        <div className="im-modal-overlay" onClick={() => setEdit(null)}>
          <div className="im-modal" onClick={e => e.stopPropagation()}>
            <div className="im-modal-header">
              <h2>Assign driver &amp; quantities</h2>
              <button className="im-modal-close" onClick={() => setEdit(null)}>✕</button>
            </div>
            <div className="im-modal-body">
              <div className="im-form-grid">
                <div className="im-field"><label>Driver</label>
                  <input value={edit.driver_name} onChange={e => setEdit(p => ({ ...p, driver_name: e.target.value }))} /></div>
                <div className="im-field"><label>Driver phone</label>
                  <input value={edit.driver_phone} onChange={e => setEdit(p => ({ ...p, driver_phone: e.target.value }))} /></div>
                <div className="im-field"><label>Vehicle no.</label>
                  <input value={edit.vehicle_no} onChange={e => setEdit(p => ({ ...p, vehicle_no: e.target.value }))} /></div>
                <div className="im-field"><label>Delivery date</label>
                  <input type="date" value={edit.delivery_date} onChange={e => setEdit(p => ({ ...p, delivery_date: e.target.value }))} /></div>
              </div>
              <div className="im-detail-section-title" style={{ paddingLeft: 0 }}>Quantity to deliver</div>
              {edit.items.map((it, idx) => (
                <div key={it.id} style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13 }}>{it.description} <small style={{ color: 'var(--text-muted)' }}>of {it.ordered} ordered</small></span>
                  <input type="number" min="0" max={it.ordered} value={it.qty}
                    onChange={e => setEdit(p => ({ ...p, items: p.items.map((x, j) => j === idx ? { ...x, qty: e.target.value } : x) }))} />
                </div>
              ))}
            </div>
            <div className="im-modal-footer">
              <button className="im-btn-ghost" onClick={() => setEdit(null)}>Cancel</button>
              <button className="im-btn-primary" onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {proof && (
        <div className="im-modal-overlay" onClick={() => setProof(null)}>
          <div className="im-modal" onClick={e => e.stopPropagation()}>
            <div className="im-modal-header">
              <h2>Proof of delivery</h2>
              <button className="im-modal-close" onClick={() => setProof(null)}>✕</button>
            </div>
            <div className="im-modal-body">
              <div className="im-form-grid">
                <div className="im-field span-2">
                  <label>Received by</label>
                  <input value={proof.received_by} placeholder="Name of person who signed"
                    onChange={e => setProof(p => ({ ...p, received_by: e.target.value }))} />
                </div>
              </div>
              <div className="im-lines" style={{ marginTop: 12 }}>
                {proof.items.map((it, idx) => (
                  <div key={it.item_id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 110px', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 13 }}>{it.description} <small style={{ color: 'var(--text-muted)' }}>/ {it.ordered}</small></span>
                    <input type="number" min="0" max={it.ordered} value={it.qty_received}
                      onChange={e => setProof(p => ({ ...p, items: p.items.map((x, j) => j === idx ? { ...x, qty_received: e.target.value } : x) }))} />
                    <select value={it.condition}
                      onChange={e => setProof(p => ({ ...p, items: p.items.map((x, j) => j === idx ? { ...x, condition: e.target.value } : x) }))}>
                      <option>Good</option><option>Damaged</option><option>Short</option>
                    </select>
                  </div>
                ))}
              </div>
              <div className="im-form-grid">
                <div className="im-field span-2">
                  <label>Notes</label>
                  <input value={proof.notes} onChange={e => setProof(p => ({ ...p, notes: e.target.value }))} />
                </div>
                <div className="im-field span-2">
                  <label>Photos of signed delivery note / goods ({proof.photos.length}/{MAX_PHOTOS})</label>
                  <input type="file" accept="image/*" capture="environment" multiple
                    disabled={proof.photos.length >= MAX_PHOTOS}
                    onChange={e => { addPhotos(e.target.files); e.target.value = ''; }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    {proof.photos.map((src, i) => (
                      <div key={i} style={{ position: 'relative' }}>
                        <img src={src} alt="" style={{ height: 72, borderRadius: 6 }} />
                        <button type="button" className="im-modal-close" style={{ position: 'absolute', top: -6, right: -6 }}
                          onClick={() => setProof(p => ({ ...p, photos: p.photos.filter((_, j) => j !== i) }))}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="im-modal-footer">
              <button className="im-btn-ghost" onClick={() => setProof(null)}>Cancel</button>
              <button className="im-btn-primary" onClick={submitProof} disabled={saving}>
                {saving ? 'Saving…' : 'Mark delivered'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
