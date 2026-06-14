import { useState } from 'react';

const ORDERS = [
  {
    id: 'SO-0041', customer: 'Kasem Construction', date: '2025-06-09', due: '2025-06-23',
    status: 'dispatched', payment: 'unpaid',
    items: [
      { name: 'Cable 2.5mm (100m roll)', sku: 'CBL-2.5-100', qty: 10, price: 1200 },
      { name: 'Drain Cover 300×300mm',   sku: 'DRN-300-300', qty: 20, price: 290  },
      { name: 'Steel Conduit 20mm (3m)', sku: 'CDT-20-3M',   qty: 15, price: 150  },
    ],
  },
  {
    id: 'SO-0040', customer: 'Phuket Build Ltd.', date: '2025-06-08', due: '2025-06-22',
    status: 'pending', payment: 'unpaid',
    items: [
      { name: 'Cable 4mm (100m roll)', sku: 'CBL-4-100', qty: 5,  price: 1800 },
      { name: 'PVC Junction Box 4"',   sku: 'JBX-PVC-4', qty: 40, price: 75   },
    ],
  },
  {
    id: 'SO-0039', customer: 'Central Hardware', date: '2025-06-07', due: '2025-06-21',
    status: 'delivered', payment: 'paid',
    items: [
      { name: 'Cable 6mm (100m roll)',  sku: 'CBL-6-100',   qty: 8,  price: 2500 },
      { name: 'Cable Tray 100mm (2m)', sku: 'CTR-100-2M',  qty: 30, price: 420  },
      { name: 'Gland Plate 150×150mm', sku: 'GLP-150-150', qty: 50, price: 110  },
    ],
  },
  {
    id: 'SO-0038', customer: 'Nonthaburi Works', date: '2025-06-06', due: '2025-06-20',
    status: 'pending', payment: 'unpaid',
    items: [
      { name: 'Drain Cover 450×450mm',   sku: 'DRN-450-450', qty: 25, price: 490 },
      { name: 'Steel Conduit 25mm (3m)', sku: 'CDT-25-3M',   qty: 10, price: 185 },
    ],
  },
  {
    id: 'SO-0037', customer: 'Siam Industrial', date: '2025-06-05', due: '2025-06-19',
    status: 'delivered', payment: 'paid',
    items: [
      { name: 'Cable 2.5mm (100m roll)', sku: 'CBL-2.5-100', qty: 20, price: 1200 },
      { name: 'PVC Junction Box 4"',     sku: 'JBX-PVC-4',   qty: 60, price: 75   },
    ],
  },
  {
    id: 'SO-0036', customer: 'BKK Contractors', date: '2025-06-04', due: '2025-06-18',
    status: 'confirmed', payment: 'unpaid',
    items: [
      { name: 'Steel Conduit 20mm (3m)', sku: 'CDT-20-3M',   qty: 40, price: 150 },
      { name: 'Gland Plate 150×150mm',   sku: 'GLP-150-150', qty: 30, price: 110 },
    ],
  },
];

const ORDER_STATUS = {
  pending:    { label: 'Pending',    cls: 'warn'  },
  confirmed:  { label: 'Confirmed',  cls: 'info'  },
  dispatched: { label: 'Dispatched', cls: 'blue'  },
  delivered:  { label: 'Delivered',  cls: 'ok'    },
  cancelled:  { label: 'Cancelled',  cls: 'muted' },
};

const PAYMENT_STATUS = {
  paid:    { label: 'Paid',    cls: 'ok'   },
  unpaid:  { label: 'Unpaid',  cls: 'warn' },
  overdue: { label: 'Overdue', cls: 'out'  },
};

function orderTotal(order) {
  return order.items.reduce((s, i) => s + i.qty * i.price, 0);
}

const PRODUCTS_LIST = [
  { name: 'Cable 2.5mm (100m roll)', sku: 'CBL-2.5-100', price: 1200 },
  { name: 'Cable 4mm (100m roll)',   sku: 'CBL-4-100',   price: 1800 },
  { name: 'Cable 6mm (100m roll)',   sku: 'CBL-6-100',   price: 2500 },
  { name: 'Drain Cover 300×300mm',   sku: 'DRN-300-300', price: 290  },
  { name: 'Drain Cover 450×450mm',   sku: 'DRN-450-450', price: 490  },
  { name: 'Steel Conduit 20mm (3m)', sku: 'CDT-20-3M',   price: 150  },
  { name: 'Steel Conduit 25mm (3m)', sku: 'CDT-25-3M',   price: 185  },
  { name: 'PVC Junction Box 4"',     sku: 'JBX-PVC-4',   price: 75   },
  { name: 'Cable Tray 100mm (2m)',   sku: 'CTR-100-2M',  price: 420  },
  { name: 'Gland Plate 150×150mm',   sku: 'GLP-150-150', price: 110  },
];

const DEFAULT_CUSTOMERS = [
  'Kasem Construction', 'Phuket Build Ltd.', 'Central Hardware',
  'Nonthaburi Works', 'Siam Industrial', 'BKK Contractors',
];

const DEFAULT_TERMS = ['Net 14', 'Net 30', 'Net 60', 'Due on receipt'];

const PRODUCT_SELECT_STYLE = {
  flex: '2 1 0', minWidth: 0,
  padding: '8px 32px 8px 10px',
  border: '1px solid #E5E7EB', borderRadius: 5, fontSize: 13,
  background: `#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat right 10px center`,
  backgroundSize: '12px', fontFamily: 'inherit', appearance: 'none', color: '#111827',
};

const ADD_INPUT_STYLE = {
  flex: 1, padding: '7px 10px', border: '1px solid #E5E7EB',
  borderRadius: 6, fontSize: 13, fontFamily: 'inherit',
  color: '#111827', background: '#fff', outline: 'none',
};

function blankLine() {
  return { product: PRODUCTS_LIST[0].name, sku: PRODUCTS_LIST[0].sku, qty: 1, price: PRODUCTS_LIST[0].price };
}

export default function SalesOrders() {
  const [search,     setSearch]     = useState('');
  const [statusFilt, setStatusFilt] = useState('All');
  const [expanded,   setExpanded]   = useState(null);
  const [showNew,    setShowNew]    = useState(false);

  // Form state
  const [customers,        setCustomers]        = useState(DEFAULT_CUSTOMERS);
  const [formCustomer,     setFormCustomer]      = useState(DEFAULT_CUSTOMERS[0]);
  const [newCustMode,      setNewCustMode]       = useState(false);
  const [newCustInput,     setNewCustInput]      = useState('');

  const [paymentTerms,     setPaymentTerms]      = useState(DEFAULT_TERMS);
  const [formTerm,         setFormTerm]          = useState(DEFAULT_TERMS[0]);
  const [newTermMode,      setNewTermMode]       = useState(false);
  const [newTermInput,     setNewTermInput]      = useState('');

  const [lineItems,        setLineItems]         = useState([blankLine()]);

  const statuses = ['All', 'Pending', 'Confirmed', 'Dispatched', 'Delivered'];

  const filtered = ORDERS.filter(o => {
    const matchS = statusFilt === 'All' || o.status === statusFilt.toLowerCase();
    const matchQ = o.id.toLowerCase().includes(search.toLowerCase()) ||
                   o.customer.toLowerCase().includes(search.toLowerCase());
    return matchS && matchQ;
  });

  const totalRevenue = ORDERS.reduce((s, o) => s + orderTotal(o), 0);
  const pendingCount = ORDERS.filter(o => o.status === 'pending' || o.status === 'confirmed').length;
  const unpaidValue  = ORDERS.filter(o => o.payment === 'unpaid').reduce((s, o) => s + orderTotal(o), 0);
  const unpaidCount  = ORDERS.filter(o => o.payment === 'unpaid').length;

  const formTotal = lineItems.reduce((s, i) => s + i.qty * i.price, 0);

  function addLineItem() {
    setLineItems(prev => [...prev, blankLine()]);
  }

  function removeLineItem(idx) {
    setLineItems(prev => prev.filter((_, i) => i !== idx));
  }

  function updateLineItem(idx, field, value) {
    setLineItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      if (field === 'product') {
        const found = PRODUCTS_LIST.find(p => p.name === value);
        return { ...item, product: value, sku: found?.sku || '', price: found?.price || 0 };
      }
      return { ...item, [field]: field === 'qty' || field === 'price' ? Number(value) : value };
    }));
  }

  function addCustomer() {
    const name = newCustInput.trim();
    if (name) {
      setCustomers(prev => [...prev, name]);
      setFormCustomer(name);
    }
    setNewCustMode(false);
    setNewCustInput('');
  }

  function addTerm() {
    const term = newTermInput.trim();
    if (term) {
      setPaymentTerms(prev => [...prev, term]);
      setFormTerm(term);
    }
    setNewTermMode(false);
    setNewTermInput('');
  }

  function closeModal() {
    setShowNew(false);
    setFormCustomer(DEFAULT_CUSTOMERS[0]);
    setNewCustMode(false); setNewCustInput('');
    setFormTerm(DEFAULT_TERMS[0]);
    setNewTermMode(false); setNewTermInput('');
    setLineItems([blankLine()]);
  }

  return (
    <div className="im-orders-page">

      <div className="im-prod-stats">
        <div className="im-prod-stat">
          <div className="im-prod-stat-val">{ORDERS.length}</div>
          <div className="im-prod-stat-lbl">Total orders</div>
        </div>
        <div className="im-prod-stat-div" />
        <div className="im-prod-stat">
          <div className="im-prod-stat-val">${totalRevenue.toLocaleString()}</div>
          <div className="im-prod-stat-lbl">Total value</div>
        </div>
        <div className="im-prod-stat-div" />
        <div className="im-prod-stat">
          <div className="im-prod-stat-val" style={{color:'#D97706'}}>{pendingCount}</div>
          <div className="im-prod-stat-lbl">Pending / to fulfil</div>
        </div>
        <div className="im-prod-stat-div" />
        <div className="im-prod-stat">
          <div className="im-prod-stat-val" style={{color:'#DC2626'}}>${unpaidValue.toLocaleString()}</div>
          <div className="im-prod-stat-lbl">Outstanding ({unpaidCount} orders)</div>
        </div>
        <button className="im-add-btn" onClick={() => setShowNew(true)}>+ New order</button>
      </div>

      <div className="im-prod-filters">
        <div className="im-search-wrap">
          <svg className="im-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="im-search"
            placeholder="Search by order ID or customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="im-cat-tabs">
          {statuses.map(s => (
            <button key={s} className={`im-cat-tab ${statusFilt === s ? 'active' : ''}`}
              onClick={() => setStatusFilt(s)}>{s}</button>
          ))}
        </div>
      </div>

      <div className="im-panel">
        <div className="im-order-table-head">
          <span>Order ID</span><span>Customer</span><span>Date</span><span>Due</span>
          <span>Items</span><span>Total</span><span>Payment</span><span>Status</span><span></span>
        </div>

        {filtered.map(order => (
          <div key={order.id}>
            <div
              className={`im-order-row ${expanded === order.id ? 'expanded' : ''}`}
              onClick={() => setExpanded(expanded === order.id ? null : order.id)}
            >
              <span className="im-order-id">{order.id}</span>
              <span className="im-order-cust">{order.customer}</span>
              <span className="im-order-date">{order.date}</span>
              <span className="im-order-date">{order.due}</span>
              <span className="im-order-items-count">{order.items.length} items</span>
              <span className="im-order-total-val">${orderTotal(order).toLocaleString()}</span>
              <span className={`im-status-badge ${PAYMENT_STATUS[order.payment].cls}`}>
                {PAYMENT_STATUS[order.payment].label}
              </span>
              <span className={`im-status-badge ${ORDER_STATUS[order.status].cls}`}>
                {ORDER_STATUS[order.status].label}
              </span>
              <div className="im-prod-actions">
                <button className="im-action-btn" title="Edit" onClick={e => e.stopPropagation()}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button className="im-action-btn" title="Invoice" onClick={e => e.stopPropagation()}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                </button>
              </div>
            </div>

            {expanded === order.id && (
              <div className="im-order-detail">
                <div className="im-order-detail-head">
                  <span style={{flex:2}}>Product</span>
                  <span>SKU</span><span>Qty</span><span>Unit price</span><span>Line total</span>
                </div>
                {order.items.map((item, i) => (
                  <div className="im-order-detail-row" key={i}>
                    <span className="im-detail-name" style={{flex:2}}>{item.name}</span>
                    <span className="im-detail-sku">{item.sku}</span>
                    <span className="im-detail-qty">{item.qty}</span>
                    <span className="im-detail-price">${item.price.toLocaleString()}</span>
                    <span className="im-detail-total">${(item.qty * item.price).toLocaleString()}</span>
                  </div>
                ))}
                <div className="im-order-detail-footer">
                  <span>Order total</span>
                  <span className="im-detail-grand">${orderTotal(order).toLocaleString()}</span>
                </div>
                <div className="im-order-detail-actions">
                  <button className="im-btn-secondary" style={{fontSize:'12px', padding:'7px 14px'}}>Mark as paid</button>
                  <button className="im-btn-secondary" style={{fontSize:'12px', padding:'7px 14px'}}>Update status</button>
                  <button className="im-btn-primary"   style={{fontSize:'12px', padding:'7px 14px'}}>Download invoice</button>
                </div>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && <div className="im-empty">No orders match your search.</div>}
      </div>

      {showNew && (
        <div className="im-modal-overlay" onClick={closeModal}>
          <div className="im-modal" style={{maxWidth:'680px'}} onClick={e => e.stopPropagation()}>
            <div className="im-modal-header">
              <h3>New sales order</h3>
              <button className="im-modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="im-modal-body">
              <div className="im-form-grid">

                {/* Customer */}
                <div className="im-field" style={{gridColumn:'1/-1'}}>
                  <label>Customer</label>
                  <select
                    value={formCustomer}
                    onChange={e => {
                      if (e.target.value === '__add_new_customer__') {
                        setNewCustMode(true);
                      } else {
                        setFormCustomer(e.target.value);
                        setNewCustMode(false);
                      }
                    }}
                  >
                    {customers.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="__add_new_customer__">＋ Add new customer</option>
                  </select>
                  {newCustMode && (
                    <div style={{display:'flex', gap:6, marginTop:6, alignItems:'center'}}>
                      <input
                        autoFocus
                        placeholder="Customer name"
                        value={newCustInput}
                        onChange={e => setNewCustInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addCustomer(); if (e.key === 'Escape') { setNewCustMode(false); setNewCustInput(''); } }}
                        style={ADD_INPUT_STYLE}
                      />
                      <button onClick={addCustomer} style={{padding:'7px 12px', background:'#059669', color:'#fff', border:'none', borderRadius:6, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap'}}>Add</button>
                      <button onClick={() => { setNewCustMode(false); setNewCustInput(''); }} style={{padding:'7px 10px', background:'none', color:'#6B7280', border:'1px solid #E5E7EB', borderRadius:6, fontSize:12, cursor:'pointer', fontFamily:'inherit'}}>Cancel</button>
                    </div>
                  )}
                </div>

                <div className="im-field">
                  <label>Order date</label>
                  <input type="date" defaultValue="2025-06-09" />
                </div>
                <div className="im-field">
                  <label>Due date</label>
                  <input type="date" defaultValue="2025-06-23" />
                </div>
                <div className="im-field">
                  <label>Reference</label>
                  <input placeholder="e.g. PO-12345 (optional)" />
                </div>

                {/* Payment terms */}
                <div className="im-field">
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
              </div>

              {/* Line items */}
              <div className="im-order-items-section">
                <div className="im-order-items-label">Line items</div>
                <div className="im-order-items-head">
                  <span style={{flex:'2 1 0', minWidth:0}}>Product</span>
                  <span style={{flex:'0 0 100px'}}>SKU</span>
                  <span style={{flex:'0 0 60px'}}>Qty</span>
                  <span style={{flex:'0 0 90px'}}>Unit price</span>
                  <span style={{flex:'0 0 72px'}}>Total</span>
                  <span style={{flex:'0 0 28px'}}></span>
                </div>
                {lineItems.map((item, idx) => (
                  <div className="im-order-item-row" key={idx}>
                    <select
                      style={PRODUCT_SELECT_STYLE}
                      value={item.product}
                      onChange={e => updateLineItem(idx, 'product', e.target.value)}
                    >
                      {PRODUCTS_LIST.map(p => <option key={p.sku} value={p.name}>{p.name}</option>)}
                    </select>
                    <span style={{flex:'0 0 100px', fontFamily:"'DM Mono', monospace", fontSize:11, color:'#9CA3AF', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'flex', alignItems:'center'}}>
                      {item.sku}
                    </span>
                    <input
                      type="number" min="1"
                      value={item.qty}
                      onChange={e => updateLineItem(idx, 'qty', e.target.value)}
                      style={{flex:'0 0 60px', width:'60px', minWidth:0, padding:'8px 6px', border:'1px solid #E5E7EB', borderRadius:5, fontSize:13, background:'#fff', color:'#111827', fontFamily:'inherit', appearance:'none'}}
                    />
                    <input
                      type="number"
                      value={item.price}
                      onChange={e => updateLineItem(idx, 'price', e.target.value)}
                      style={{flex:'0 0 90px', width:'90px', minWidth:0, padding:'8px 6px', border:'1px solid #E5E7EB', borderRadius:5, fontSize:13, background:'#fff', color:'#111827', fontFamily:'inherit', appearance:'none'}}
                    />
                    <span style={{flex:'0 0 72px', fontWeight:700, fontSize:13, display:'flex', alignItems:'center', paddingLeft:4, color:'#111827'}}>
                      ${(item.qty * item.price).toLocaleString()}
                    </span>
                    <button
                      onClick={() => removeLineItem(idx)}
                      disabled={lineItems.length === 1}
                      style={{flex:'0 0 28px', color:'#9CA3AF', fontSize:18, lineHeight:1, background:'none', border:'none', cursor: lineItems.length === 1 ? 'default' : 'pointer', opacity: lineItems.length === 1 ? 0.3 : 1, fontFamily:'inherit'}}
                    >×</button>
                  </div>
                ))}
                <button className="im-add-line-btn" onClick={addLineItem}>+ Add line item</button>
              </div>

              <div className="im-field" style={{marginTop:16}}>
                <label>Notes</label>
                <input placeholder="Internal notes or delivery instructions..." />
              </div>
            </div>
            <div className="im-modal-footer">
              <div style={{fontSize:13, color:'#6B7280'}}>
                Total: <strong style={{color:'#111827', fontSize:15}}>${formTotal.toLocaleString()}</strong>
              </div>
              <div style={{display:'flex', gap:10}}>
                <button className="im-btn-secondary" onClick={closeModal}>Cancel</button>
                <button className="im-btn-primary">Create order</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
