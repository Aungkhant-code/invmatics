import { useState } from 'react';
import './Customers.css';

// ── Data ───────────────────────────────────────────────────────────
const CUSTOMERS = [
  {
    id: 'C001', name: 'Kasem Construction', contact: 'Kasem Wongwit',
    phone: '+66 81 234 5678', email: 'kasem@kasemcon.co.th',
    address: '45 Rama IV Rd, Bangkok 10500', taxId: '0105562011111',
    creditLimit: 500000, outstanding: 84500, terms: 'Net 14',
    totalOrders: 12, totalSpend: 1240000, lastOrder: '2025-06-09',
    status: 'active', notes: 'Key account. Prefers morning deliveries.'
  },
  {
    id: 'C002', name: 'Phuket Build Ltd.', contact: 'Wanchai Srisom',
    phone: '+66 76 345 6789', email: 'w.srisom@phuketbuild.com',
    address: '12 Thepkrasattri Rd, Phuket 83000', taxId: '0845562022222',
    creditLimit: 300000, outstanding: 32100, terms: 'Net 30',
    totalOrders: 7, totalSpend: 680000, lastOrder: '2025-06-08',
    status: 'active', notes: ''
  },
  {
    id: 'C003', name: 'Central Hardware', contact: 'Sunisa Thamrong',
    phone: '+66 2 456 7890', email: 'sunisa@centralhw.com',
    address: '88 Lat Phrao Rd, Bangkok 10230', taxId: '0105562033333',
    creditLimit: 800000, outstanding: 0, terms: 'Net 30',
    totalOrders: 24, totalSpend: 3100000, lastOrder: '2025-06-07',
    status: 'active', notes: 'Largest account. Monthly standing order.'
  },
  {
    id: 'C004', name: 'Nonthaburi Works', contact: 'Pradit Suwanna',
    phone: '+66 2 567 8901', email: 'pradit@ntbworks.com',
    address: '5 Nonthaburi Rd, Nonthaburi 11000', taxId: '0115562044444',
    creditLimit: 200000, outstanding: 38200, terms: 'Net 14',
    totalOrders: 5, totalSpend: 290000, lastOrder: '2025-06-06',
    status: 'overdue', notes: 'Invoice INV-00036 overdue. Follow up required.'
  },
  {
    id: 'C005', name: 'Siam Industrial', contact: 'Teerachai Pornpan',
    phone: '+66 2 678 9012', email: 't.pornpan@siamind.co.th',
    address: '200 Industrial Ring Rd, Samut Prakan 10280', taxId: '0115562055555',
    creditLimit: 600000, outstanding: 0, terms: 'Net 30',
    totalOrders: 18, totalSpend: 2400000, lastOrder: '2025-06-05',
    status: 'active', notes: ''
  },
  {
    id: 'C006', name: 'BKK Contractors', contact: 'Somsak Chiangmai',
    phone: '+66 81 789 0123', email: 'somsak@bkkcon.com',
    address: '77 Ratchadaphisek Rd, Bangkok 10400', taxId: '0105562066666',
    creditLimit: 400000, outstanding: 18700, terms: 'Net 14',
    totalOrders: 9, totalSpend: 780000, lastOrder: '2025-06-04',
    status: 'overdue', notes: ''
  },
];

const ORDERS_BY_CUSTOMER = {
  'C001': [
    { id: 'SO-0041', date: '2025-06-09', total: 84500,  status: 'dispatched', payment: 'unpaid' },
    { id: 'SO-0028', date: '2025-05-20', total: 124000, status: 'delivered',  payment: 'paid'   },
    { id: 'SO-0015', date: '2025-04-10', total: 98000,  status: 'delivered',  payment: 'paid'   },
  ],
  'C003': [
    { id: 'SO-0039', date: '2025-06-07', total: 156200, status: 'delivered', payment: 'paid' },
    { id: 'SO-0025', date: '2025-05-15', total: 210000, status: 'delivered', payment: 'paid' },
  ],
};

const STATUS = {
  active:  { label: 'Active',  cls: 'cust-active'  },
  overdue: { label: 'Overdue', cls: 'cust-overdue' },
  inactive:{ label: 'Inactive',cls: 'cust-inactive'},
};

function creditUsed(c) {
  return c.creditLimit > 0
    ? Math.round((c.outstanding / c.creditLimit) * 100)
    : 0;
}

// ── Customer detail panel ──────────────────────────────────────────
function CustomerDetail({ customer, onClose }) {
  const orders = ORDERS_BY_CUSTOMER[customer.id] || [];
  const used   = creditUsed(customer);

  return (
    <div className="cust-detail-overlay" onClick={onClose}>
      <div className="cust-detail-panel" onClick={e => e.stopPropagation()}>
        <div className="cust-detail-header">
          <div>
            <h2 className="cust-detail-name">{customer.name}</h2>
            <span className={`cust-status-badge ${STATUS[customer.status].cls}`}>
              {STATUS[customer.status].label}
            </span>
          </div>
          <button className="cust-detail-close" onClick={onClose}>✕</button>
        </div>

        <div className="cust-detail-body">

          {/* Contact info */}
          <div className="cust-detail-section">
            <div className="cust-detail-section-title">Contact information</div>
            <div className="cust-info-grid">
              <div className="cust-info-item">
                <span className="cust-info-label">Contact person</span>
                <span className="cust-info-val">{customer.contact}</span>
              </div>
              <div className="cust-info-item">
                <span className="cust-info-label">Phone</span>
                <span className="cust-info-val">{customer.phone}</span>
              </div>
              <div className="cust-info-item">
                <span className="cust-info-label">Email</span>
                <span className="cust-info-val">{customer.email}</span>
              </div>
              <div className="cust-info-item">
                <span className="cust-info-label">Tax ID</span>
                <span className="cust-info-val cust-mono">{customer.taxId}</span>
              </div>
              <div className="cust-info-item" style={{gridColumn:'1/-1'}}>
                <span className="cust-info-label">Address</span>
                <span className="cust-info-val">{customer.address}</span>
              </div>
            </div>
          </div>

          {/* Financials */}
          <div className="cust-detail-section">
            <div className="cust-detail-section-title">Account & financials</div>
            <div className="cust-fin-grid">
              <div className="cust-fin-card">
                <div className="cust-fin-val">${customer.totalSpend.toLocaleString()}</div>
                <div className="cust-fin-lbl">Total lifetime spend</div>
              </div>
              <div className="cust-fin-card">
                <div className={`cust-fin-val ${customer.outstanding > 0 ? 'cust-red' : 'cust-green'}`}>
                  ${customer.outstanding.toLocaleString()}
                </div>
                <div className="cust-fin-lbl">Outstanding balance</div>
              </div>
              <div className="cust-fin-card">
                <div className="cust-fin-val">{customer.totalOrders}</div>
                <div className="cust-fin-lbl">Total orders</div>
              </div>
              <div className="cust-fin-card">
                <div className="cust-fin-val">{customer.terms}</div>
                <div className="cust-fin-lbl">Payment terms</div>
              </div>
            </div>

            {/* Credit limit bar */}
            <div className="cust-credit-bar-wrap">
              <div className="cust-credit-bar-labels">
                <span className="cust-credit-label">Credit limit</span>
                <span className="cust-credit-amounts">
                  <span className={used > 80 ? 'cust-red' : ''}>
                    ${customer.outstanding.toLocaleString()}
                  </span>
                  <span className="cust-credit-sep">/</span>
                  <span>${customer.creditLimit.toLocaleString()}</span>
                  <span className="cust-credit-pct">({used}% used)</span>
                </span>
              </div>
              <div className="cust-credit-track">
                <div
                  className="cust-credit-fill"
                  style={{
                    width: `${Math.min(100, used)}%`,
                    background: used > 80 ? '#DC2626' : used > 60 ? '#D97706' : '#059669'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Order history */}
          {orders.length > 0 && (
            <div className="cust-detail-section">
              <div className="cust-detail-section-title">Recent orders</div>
              <div className="cust-orders-list">
                {orders.map(o => (
                  <div className="cust-order-row" key={o.id}>
                    <span className="cust-order-id">{o.id}</span>
                    <span className="cust-order-date">{o.date}</span>
                    <span className="cust-order-total">${o.total.toLocaleString()}</span>
                    <span className={`cust-order-badge ${o.payment === 'paid' ? 'cust-badge-paid' : 'cust-badge-unpaid'}`}>
                      {o.payment === 'paid' ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {customer.notes && (
            <div className="cust-detail-section">
              <div className="cust-detail-section-title">Notes</div>
              <div className="cust-notes-text">{customer.notes}</div>
            </div>
          )}
        </div>

        <div className="cust-detail-footer">
          <button className="cust-btn-outline">Edit customer</button>
          <button className="cust-btn-primary">New order</button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────
const DEFAULT_TERMS = ['Net 14', 'Net 30', 'Net 60', 'Due on receipt'];

const ADD_INPUT_STYLE = {
  flex: 1, padding: '7px 10px', border: '1px solid #E5E7EB',
  borderRadius: 6, fontSize: 13, fontFamily: 'inherit',
  color: '#111827', background: '#fff', outline: 'none',
};

export default function Customers() {
  const [search,      setSearch]      = useState('');
  const [statusFil,   setStatusFil]   = useState('All');
  const [selected,    setSelected]    = useState(null);
  const [showAdd,     setShowAdd]     = useState(false);

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

  const statuses = ['All', 'Active', 'Overdue', 'Inactive'];

  const filtered = CUSTOMERS.filter(c => {
    const matchS = statusFil === 'All' || c.status === statusFil.toLowerCase();
    const matchQ = c.name.toLowerCase().includes(search.toLowerCase()) ||
                   c.contact.toLowerCase().includes(search.toLowerCase()) ||
                   c.email.toLowerCase().includes(search.toLowerCase());
    return matchS && matchQ;
  });

  const totalCustomers  = CUSTOMERS.length;
  const activeCount     = CUSTOMERS.filter(c => c.status === 'active').length;
  const overdueCount    = CUSTOMERS.filter(c => c.status === 'overdue').length;
  const totalOutstanding= CUSTOMERS.reduce((s, c) => s + c.outstanding, 0);
  const totalLifetime   = CUSTOMERS.reduce((s, c) => s + c.totalSpend, 0);

  return (
    <div className="cust-page">

      {/* Stat bar */}
      <div className="cust-stat-bar">
        <div className="cust-stat">
          <div className="cust-stat-val">{totalCustomers}</div>
          <div className="cust-stat-lbl">Total customers</div>
        </div>
        <div className="cust-stat-div" />
        <div className="cust-stat">
          <div className="cust-stat-val cust-green">{activeCount}</div>
          <div className="cust-stat-lbl">Active</div>
        </div>
        <div className="cust-stat-div" />
        <div className="cust-stat">
          <div className="cust-stat-val cust-red">{overdueCount}</div>
          <div className="cust-stat-lbl">Overdue payments</div>
        </div>
        <div className="cust-stat-div" />
        <div className="cust-stat">
          <div className="cust-stat-val cust-orange">${totalOutstanding.toLocaleString()}</div>
          <div className="cust-stat-lbl">Total outstanding</div>
        </div>
        <div className="cust-stat-div" />
        <div className="cust-stat">
          <div className="cust-stat-val">${(totalLifetime/1000000).toFixed(1)}M</div>
          <div className="cust-stat-lbl">Lifetime spend</div>
        </div>
        <button className="cust-add-btn" onClick={() => setShowAdd(true)}>
          + Add customer
        </button>
      </div>

      {/* Filters */}
      <div className="cust-filters">
        <div className="cust-search-wrap">
          <svg className="cust-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="cust-search"
            placeholder="Search by name, contact or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="cust-tabs">
          {statuses.map(s => (
            <button
              key={s}
              className={`cust-tab ${statusFil === s ? 'active' : ''}`}
              onClick={() => setStatusFil(s)}
            >{s}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="cust-panel">
        <div className="cust-table-head">
          <span>Customer</span>
          <span>Contact</span>
          <span>Phone</span>
          <span>Terms</span>
          <span>Credit limit</span>
          <span>Outstanding</span>
          <span>Orders</span>
          <span>Last order</span>
          <span>Status</span>
          <span></span>
        </div>

        {filtered.map(c => {
          const used = creditUsed(c);
          return (
            <div
              className="cust-row"
              key={c.id}
              onClick={() => setSelected(c)}
            >
              <div className="cust-name-cell">
                <span className="cust-name">{c.name}</span>
                <span className="cust-tax">{c.taxId}</span>
              </div>
              <span className="cust-contact">{c.contact}</span>
              <span className="cust-phone">{c.phone}</span>
              <span className="cust-terms">{c.terms}</span>
              <div className="cust-credit-cell">
                <span className="cust-credit-limit">${c.creditLimit.toLocaleString()}</span>
                <div className="cust-mini-bar">
                  <div
                    className="cust-mini-fill"
                    style={{
                      width: `${Math.min(100, used)}%`,
                      background: used > 80 ? '#DC2626' : used > 60 ? '#D97706' : '#059669'
                    }}
                  />
                </div>
              </div>
              <span className={`cust-outstanding ${c.outstanding > 0 ? 'cust-red' : 'cust-muted'}`}>
                {c.outstanding > 0 ? `$${c.outstanding.toLocaleString()}` : '—'}
              </span>
              <span className="cust-order-count">{c.totalOrders}</span>
              <span className="cust-last-order">{c.lastOrder}</span>
              <span className={`cust-status-badge ${STATUS[c.status].cls}`}>
                {STATUS[c.status].label}
              </span>
              <div className="cust-row-actions" onClick={e => e.stopPropagation()}>
                <button
                  className="cust-action-btn"
                  title="View details"
                  onClick={() => setSelected(c)}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
                <button className="cust-action-btn" title="New order">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="cust-empty">No customers match your search.</div>
        )}
      </div>

      {/* Customer detail panel */}
      {selected && (
        <CustomerDetail customer={selected} onClose={() => setSelected(null)} />
      )}

      {/* Add customer modal */}
      {showAdd && (
        <div className="cust-modal-overlay" onClick={closeAdd}>
          <div className="cust-modal" onClick={e => e.stopPropagation()}>
            <div className="cust-modal-header">
              <h3>Add customer</h3>
              <button className="cust-modal-close" onClick={closeAdd}>✕</button>
            </div>
            <div className="cust-modal-body">
              <div className="cust-form-grid">
                <div className="cust-field cust-field-full">
                  <label>Company name</label>
                  <input placeholder="e.g. Kasem Construction" />
                </div>
                <div className="cust-field">
                  <label>Contact person</label>
                  <input placeholder="Full name" />
                </div>
                <div className="cust-field">
                  <label>Tax ID</label>
                  <input placeholder="13-digit tax ID" />
                </div>
                <div className="cust-field">
                  <label>Phone</label>
                  <input placeholder="+66 81 234 5678" />
                </div>
                <div className="cust-field">
                  <label>Email</label>
                  <input type="email" placeholder="contact@company.com" />
                </div>
                <div className="cust-field cust-field-full">
                  <label>Address</label>
                  <input placeholder="Full address" />
                </div>
                <div className="cust-field">
                  <label>Credit limit ($)</label>
                  <input type="number" placeholder="0" />
                </div>
                <div className="cust-field">
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
                <div className="cust-field cust-field-full">
                  <label>Notes</label>
                  <input placeholder="Any important notes about this customer..." />
                </div>
              </div>
            </div>
            <div className="cust-modal-footer">
              <button className="cust-btn-outline" onClick={closeAdd}>Cancel</button>
              <button className="cust-btn-primary">Add customer</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}