import { useState } from 'react';
import './Suppliers.css';

// ── Data ───────────────────────────────────────────────────────────
const SUPPLIERS = [
  {
    id: 'S001', name: 'Thai Wire Co.', contact: 'Somchai Wiratch',
    phone: '+66 2 234 5678', email: 'somchai@thaiwire.co.th',
    address: '45 Industrial Estate, Samut Prakan 10280',
    taxId: '0115562011111', leadDays: 7, terms: 'Net 30',
    totalOrders: 18, totalSpend: 2840000, outstanding: 42500,
    lastOrder: '2025-06-08', status: 'active',
    products: ['Cable 2.5mm', 'Cable 4mm', 'Cable 6mm', 'PVC Junction Box 4"'],
    notes: 'Primary cable supplier. Minimum order 20 rolls per SKU.',
    rating: 5,
  },
  {
    id: 'S002', name: 'CM Plastics', contact: 'Chamai Sriwan',
    phone: '+66 38 345 6789', email: 'chamai@cmplastics.com',
    address: '88 Amata City, Chonburi 20160',
    taxId: '0205562022222', leadDays: 4, terms: 'Net 14',
    totalOrders: 12, totalSpend: 1240000, outstanding: 0,
    lastOrder: '2025-06-07', status: 'active',
    products: ['Drain Cover 300×300mm', 'Drain Cover 450×450mm', 'Gland Plate 150×150mm'],
    notes: 'Fast lead times. Good for urgent drain cover orders.',
    rating: 4,
  },
  {
    id: 'S003', name: 'Bangkok Steel', contact: 'Prakit Steelman',
    phone: '+66 2 456 7890', email: 'prakit@bkksteel.com',
    address: '200 Bangna-Trad Rd, Bangkok 10260',
    taxId: '0105562033333', leadDays: 5, terms: 'Net 30',
    totalOrders: 9, totalSpend: 980000, outstanding: 28000,
    lastOrder: '2025-06-05', status: 'active',
    products: ['Steel Conduit 20mm', 'Steel Conduit 25mm', 'Cable Tray 100mm'],
    notes: 'Partial delivery on PO-0019. Follow up on remaining stock.',
    rating: 3,
  },
];

const PO_BY_SUPPLIER = {
  'S001': [
    { id: 'PO-0021', date: '2025-06-08', total: 76250, status: 'sent',     payment: 'unpaid' },
    { id: 'PO-0018', date: '2025-06-03', total: 36000, status: 'received', payment: 'paid'   },
    { id: 'PO-0012', date: '2025-05-15', total: 58500, status: 'received', payment: 'paid'   },
  ],
  'S002': [
    { id: 'PO-0020', date: '2025-06-07', total: 23800, status: 'received', payment: 'paid'   },
    { id: 'PO-0014', date: '2025-05-20', total: 18400, status: 'received', payment: 'paid'   },
  ],
  'S003': [
    { id: 'PO-0019', date: '2025-06-05', total: 28600, status: 'partial',  payment: 'unpaid' },
    { id: 'PO-0011', date: '2025-05-10', total: 19200, status: 'received', payment: 'paid'   },
  ],
};

const STATUS = {
  active:   { label: 'Active',   cls: 'sup-active'   },
  inactive: { label: 'Inactive', cls: 'sup-inactive' },
  paused:   { label: 'Paused',   cls: 'sup-paused'   },
};

const PO_STATUS = {
  sent:     { label: 'Sent',     cls: 'sup-po-sent'     },
  partial:  { label: 'Partial',  cls: 'sup-po-partial'  },
  received: { label: 'Received', cls: 'sup-po-received' },
  draft:    { label: 'Draft',    cls: 'sup-po-draft'    },
};

function StarRating({ rating }) {
  return (
    <div className="sup-stars">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`sup-star ${i <= rating ? 'sup-star-filled' : ''}`}>★</span>
      ))}
    </div>
  );
}

// ── Supplier detail panel ──────────────────────────────────────────
function SupplierDetail({ supplier, onClose }) {
  const orders = PO_BY_SUPPLIER[supplier.id] || [];

  return (
    <div className="sup-detail-overlay" onClick={onClose}>
      <div className="sup-detail-panel" onClick={e => e.stopPropagation()}>
        <div className="sup-detail-header">
          <div>
            <h2 className="sup-detail-name">{supplier.name}</h2>
            <div className="sup-detail-sub">
              <span className={`sup-status-badge ${STATUS[supplier.status].cls}`}>
                {STATUS[supplier.status].label}
              </span>
              <StarRating rating={supplier.rating} />
            </div>
          </div>
          <button className="sup-detail-close" onClick={onClose}>✕</button>
        </div>

        <div className="sup-detail-body">

          {/* Contact */}
          <div className="sup-detail-section">
            <div className="sup-section-title">Contact information</div>
            <div className="sup-info-grid">
              <div className="sup-info-item">
                <span className="sup-info-label">Contact person</span>
                <span className="sup-info-val">{supplier.contact}</span>
              </div>
              <div className="sup-info-item">
                <span className="sup-info-label">Phone</span>
                <span className="sup-info-val">{supplier.phone}</span>
              </div>
              <div className="sup-info-item">
                <span className="sup-info-label">Email</span>
                <span className="sup-info-val">{supplier.email}</span>
              </div>
              <div className="sup-info-item">
                <span className="sup-info-label">Tax ID</span>
                <span className="sup-info-val sup-mono">{supplier.taxId}</span>
              </div>
              <div className="sup-info-item" style={{gridColumn:'1/-1'}}>
                <span className="sup-info-label">Address</span>
                <span className="sup-info-val">{supplier.address}</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="sup-detail-section">
            <div className="sup-section-title">Account summary</div>
            <div className="sup-fin-grid">
              <div className="sup-fin-card">
                <div className="sup-fin-val">${supplier.totalSpend.toLocaleString()}</div>
                <div className="sup-fin-lbl">Total spend</div>
              </div>
              <div className="sup-fin-card">
                <div className={`sup-fin-val ${supplier.outstanding > 0 ? 'sup-orange' : 'sup-green'}`}>
                  ${supplier.outstanding.toLocaleString()}
                </div>
                <div className="sup-fin-lbl">Outstanding payable</div>
              </div>
              <div className="sup-fin-card">
                <div className="sup-fin-val">{supplier.totalOrders}</div>
                <div className="sup-fin-lbl">Total POs</div>
              </div>
              <div className="sup-fin-card">
                <div className="sup-fin-val">{supplier.leadDays}d</div>
                <div className="sup-fin-lbl">Lead time</div>
              </div>
            </div>
          </div>

          {/* Products supplied */}
          <div className="sup-detail-section">
            <div className="sup-section-title">Products supplied</div>
            <div className="sup-products-list">
              {supplier.products.map(p => (
                <span key={p} className="sup-product-tag">{p}</span>
              ))}
            </div>
          </div>

          {/* PO history */}
          {orders.length > 0 && (
            <div className="sup-detail-section">
              <div className="sup-section-title">Recent purchase orders</div>
              <div className="sup-po-list">
                {orders.map(o => (
                  <div className="sup-po-row" key={o.id}>
                    <span className="sup-po-id">{o.id}</span>
                    <span className="sup-po-date">{o.date}</span>
                    <span className="sup-po-total">${o.total.toLocaleString()}</span>
                    <span className={`sup-po-badge ${PO_STATUS[o.status].cls}`}>
                      {PO_STATUS[o.status].label}
                    </span>
                    <span className={`sup-po-badge ${o.payment === 'paid' ? 'sup-po-received' : 'sup-po-partial'}`}>
                      {o.payment === 'paid' ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {supplier.notes && (
            <div className="sup-detail-section">
              <div className="sup-section-title">Notes</div>
              <div className="sup-notes-text">{supplier.notes}</div>
            </div>
          )}
        </div>

        <div className="sup-detail-footer">
          <button className="sup-btn-outline">Edit supplier</button>
          <button className="sup-btn-primary">New purchase order</button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────
const DEFAULT_TERMS = ['Net 30', 'Net 14', 'Net 60', 'Due on receipt'];

const ADD_INPUT_STYLE = {
  flex: 1, padding: '7px 10px', border: '1px solid #E5E7EB',
  borderRadius: 6, fontSize: 13, fontFamily: 'inherit',
  color: '#111827', background: '#fff', outline: 'none',
};

export default function Suppliers() {
  const [search,       setSearch]       = useState('');
  const [selected,     setSelected]     = useState(null);
  const [showAdd,      setShowAdd]      = useState(false);

  const [paymentTerms, setPaymentTerms] = useState(DEFAULT_TERMS);
  const [formTerm,     setFormTerm]     = useState(DEFAULT_TERMS[0]);
  const [newTermMode,  setNewTermMode]  = useState(false);
  const [newTermInput, setNewTermInput] = useState('');

  function addTerm() {
    const term = newTermInput.trim();
    if (term) {
      setPaymentTerms(prev => [...prev, term]);
      setFormTerm(term);
    }
    setNewTermMode(false);
    setNewTermInput('');
  }

  function closeAdd() {
    setShowAdd(false);
    setFormTerm(DEFAULT_TERMS[0]);
    setNewTermMode(false);
    setNewTermInput('');
  }

  const filtered = SUPPLIERS.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.contact.toLowerCase().includes(search.toLowerCase())
  );

  const totalSpend      = SUPPLIERS.reduce((s, sup) => s + sup.totalSpend, 0);
  const totalOutstanding= SUPPLIERS.reduce((s, sup) => s + sup.outstanding, 0);
  const avgLead         = Math.round(SUPPLIERS.reduce((s, sup) => s + sup.leadDays, 0) / SUPPLIERS.length);

  return (
    <div className="sup-page">

      {/* Stat bar */}
      <div className="sup-stat-bar">
        <div className="sup-stat">
          <div className="sup-stat-val">{SUPPLIERS.length}</div>
          <div className="sup-stat-lbl">Total suppliers</div>
        </div>
        <div className="sup-stat-div" />
        <div className="sup-stat">
          <div className="sup-stat-val">${(totalSpend/1000000).toFixed(1)}M</div>
          <div className="sup-stat-lbl">Total spend</div>
        </div>
        <div className="sup-stat-div" />
        <div className="sup-stat">
          <div className="sup-stat-val sup-orange">${totalOutstanding.toLocaleString()}</div>
          <div className="sup-stat-lbl">Outstanding payable</div>
        </div>
        <div className="sup-stat-div" />
        <div className="sup-stat">
          <div className="sup-stat-val">{avgLead}d</div>
          <div className="sup-stat-lbl">Avg lead time</div>
        </div>
        <button className="sup-add-btn" onClick={() => setShowAdd(true)}>
          + Add supplier
        </button>
      </div>

      {/* Search */}
      <div className="sup-filters">
        <div className="sup-search-wrap">
          <svg className="sup-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="sup-search"
            placeholder="Search by supplier name or contact..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Supplier cards */}
      <div className="sup-cards-grid">
        {filtered.map(sup => (
          <div
            className="sup-card"
            key={sup.id}
            onClick={() => setSelected(sup)}
          >
            <div className="sup-card-header">
              <div className="sup-card-avatar">
                {sup.name.split(' ').map(w => w[0]).join('').slice(0,2)}
              </div>
              <div className="sup-card-title">
                <span className="sup-card-name">{sup.name}</span>
                <span className={`sup-status-badge ${STATUS[sup.status].cls}`}>
                  {STATUS[sup.status].label}
                </span>
              </div>
              <StarRating rating={sup.rating} />
            </div>

            <div className="sup-card-contact">
              <span className="sup-card-person">{sup.contact}</span>
              <span className="sup-card-phone">{sup.phone}</span>
            </div>

            <div className="sup-card-stats">
              <div className="sup-card-stat">
                <div className="sup-card-stat-val">{sup.leadDays}d</div>
                <div className="sup-card-stat-lbl">Lead time</div>
              </div>
              <div className="sup-card-stat">
                <div className="sup-card-stat-val">{sup.terms}</div>
                <div className="sup-card-stat-lbl">Terms</div>
              </div>
              <div className="sup-card-stat">
                <div className="sup-card-stat-val">{sup.totalOrders}</div>
                <div className="sup-card-stat-lbl">POs</div>
              </div>
              <div className="sup-card-stat">
                <div className={`sup-card-stat-val ${sup.outstanding > 0 ? 'sup-orange' : ''}`}>
                  ${sup.outstanding > 0 ? sup.outstanding.toLocaleString() : '0'}
                </div>
                <div className="sup-card-stat-lbl">Owed</div>
              </div>
            </div>

            <div className="sup-card-products">
              {sup.products.slice(0,3).map(p => (
                <span key={p} className="sup-mini-tag">{p}</span>
              ))}
              {sup.products.length > 3 && (
                <span className="sup-mini-tag sup-more">+{sup.products.length - 3}</span>
              )}
            </div>

            <div className="sup-card-footer">
              <span className="sup-card-last">Last order {sup.lastOrder}</span>
              <button
                className="sup-card-po-btn"
                onClick={e => { e.stopPropagation(); }}
              >
                New PO →
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="sup-empty">No suppliers match your search.</div>
      )}

      {/* Supplier detail panel */}
      {selected && (
        <SupplierDetail supplier={selected} onClose={() => setSelected(null)} />
      )}

      {/* Add supplier modal */}
      {showAdd && (
        <div className="sup-modal-overlay" onClick={closeAdd}>
          <div className="sup-modal" onClick={e => e.stopPropagation()}>
            <div className="sup-modal-header">
              <h3>Add supplier</h3>
              <button className="sup-modal-close" onClick={closeAdd}>✕</button>
            </div>
            <div className="sup-modal-body">
              <div className="sup-form-grid">
                <div className="sup-field sup-field-full">
                  <label>Company name</label>
                  <input placeholder="e.g. Thai Wire Co." />
                </div>
                <div className="sup-field">
                  <label>Contact person</label>
                  <input placeholder="Full name" />
                </div>
                <div className="sup-field">
                  <label>Tax ID</label>
                  <input placeholder="13-digit tax ID" />
                </div>
                <div className="sup-field">
                  <label>Phone</label>
                  <input placeholder="+66 2 234 5678" />
                </div>
                <div className="sup-field">
                  <label>Email</label>
                  <input type="email" placeholder="contact@supplier.com" />
                </div>
                <div className="sup-field sup-field-full">
                  <label>Address</label>
                  <input placeholder="Full address" />
                </div>
                <div className="sup-field">
                  <label>Lead time (days)</label>
                  <input type="number" placeholder="e.g. 7" />
                </div>
                <div className="sup-field">
                  <label>Payment terms</label>
                  <select
                    value={formTerm}
                    onChange={e => {
                      if (e.target.value === '__add_new_term__') {
                        setNewTermMode(true);
                      } else {
                        setFormTerm(e.target.value);
                        setNewTermMode(false);
                      }
                    }}
                  >
                    {paymentTerms.map(t => <option key={t} value={t}>{t}</option>)}
                    <option value="__add_new_term__">＋ Add new term</option>
                  </select>
                  {newTermMode && (
                    <div style={{display:'flex', gap:6, marginTop:6, alignItems:'center'}}>
                      <input
                        autoFocus
                        placeholder="e.g. Net 45"
                        value={newTermInput}
                        onChange={e => setNewTermInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addTerm(); if (e.key === 'Escape') { setNewTermMode(false); setNewTermInput(''); } }}
                        style={ADD_INPUT_STYLE}
                      />
                      <button onClick={addTerm} style={{padding:'7px 12px', background:'#059669', color:'#fff', border:'none', borderRadius:6, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap'}}>Add</button>
                      <button onClick={() => { setNewTermMode(false); setNewTermInput(''); }} style={{padding:'7px 10px', background:'none', color:'#6B7280', border:'1px solid #E5E7EB', borderRadius:6, fontSize:12, cursor:'pointer', fontFamily:'inherit'}}>Cancel</button>
                    </div>
                  )}
                </div>
                <div className="sup-field sup-field-full">
                  <label>Notes</label>
                  <input placeholder="Minimum order quantities, special terms..." />
                </div>
              </div>
            </div>
            <div className="sup-modal-footer">
              <button className="sup-btn-outline" onClick={closeAdd}>Cancel</button>
              <button className="sup-btn-primary">Add supplier</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}