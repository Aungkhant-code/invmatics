import { useState } from 'react';
import './PurchaseOrders.css';

// ── Data ───────────────────────────────────────────────────────────
const PURCHASE_ORDERS = [
  {
    id: 'PO-0021', supplier: 'Thai Wire Co.', date: '2025-06-08',
    expectedDelivery: '2025-06-15', status: 'sent', payment: 'unpaid',
    items: [
      { name: 'Cable 2.5mm (100m roll)', sku: 'CBL-2.5-100', qty: 50,  unitCost: 850  },
      { name: 'Cable 4mm (100m roll)',   sku: 'CBL-4-100',   qty: 30,  unitCost: 1250 },
      { name: 'PVC Junction Box 4"',     sku: 'JBX-PVC-4',   qty: 100, unitCost: 45   },
    ]
  },
  {
    id: 'PO-0020', supplier: 'CM Plastics', date: '2025-06-07',
    expectedDelivery: '2025-06-14', status: 'received', payment: 'paid',
    items: [
      { name: 'Drain Cover 300×300mm', sku: 'DRN-300-300', qty: 60, unitCost: 180 },
      { name: 'Drain Cover 450×450mm', sku: 'DRN-450-450', qty: 40, unitCost: 320 },
    ]
  },
  {
    id: 'PO-0019', supplier: 'Bangkok Steel', date: '2025-06-05',
    expectedDelivery: '2025-06-12', status: 'partial', payment: 'unpaid',
    items: [
      { name: 'Steel Conduit 20mm (3m)', sku: 'CDT-20-3M',  qty: 80, unitCost: 95  },
      { name: 'Steel Conduit 25mm (3m)', sku: 'CDT-25-3M',  qty: 50, unitCost: 120 },
      { name: 'Cable Tray 100mm (2m)',   sku: 'CTR-100-2M', qty: 40, unitCost: 280 },
    ]
  },
  {
    id: 'PO-0018', supplier: 'Thai Wire Co.', date: '2025-06-03',
    expectedDelivery: '2025-06-10', status: 'received', payment: 'paid',
    items: [
      { name: 'Cable 6mm (100m roll)', sku: 'CBL-6-100', qty: 20, unitCost: 1800 },
    ]
  },
  {
    id: 'PO-0017', supplier: 'CM Plastics', date: '2025-06-01',
    expectedDelivery: '2025-06-08', status: 'draft', payment: 'unpaid',
    items: [
      { name: 'Gland Plate 150×150mm', sku: 'GLP-150-150', qty: 120, unitCost: 65 },
    ]
  },
];

const DEFAULT_SUPPLIERS = ['Thai Wire Co.', 'CM Plastics', 'Bangkok Steel'];
const DEFAULT_TERMS     = ['Net 30', 'Net 14', 'Net 60', 'Due on receipt'];

const PRODUCTS_LIST = [
  { name: 'Cable 2.5mm (100m roll)', sku: 'CBL-2.5-100', cost: 850  },
  { name: 'Cable 4mm (100m roll)',   sku: 'CBL-4-100',   cost: 1250 },
  { name: 'Cable 6mm (100m roll)',   sku: 'CBL-6-100',   cost: 1800 },
  { name: 'Drain Cover 300×300mm',   sku: 'DRN-300-300', cost: 180  },
  { name: 'Drain Cover 450×450mm',   sku: 'DRN-450-450', cost: 320  },
  { name: 'Steel Conduit 20mm (3m)', sku: 'CDT-20-3M',   cost: 95   },
  { name: 'Steel Conduit 25mm (3m)', sku: 'CDT-25-3M',   cost: 120  },
  { name: 'PVC Junction Box 4"',     sku: 'JBX-PVC-4',   cost: 45   },
  { name: 'Cable Tray 100mm (2m)',   sku: 'CTR-100-2M',  cost: 280  },
  { name: 'Gland Plate 150×150mm',   sku: 'GLP-150-150', cost: 65   },
];

const PO_STATUS = {
  draft:    { label: 'Draft',    cls: 'po-draft'    },
  sent:     { label: 'Sent',     cls: 'po-sent'     },
  partial:  { label: 'Partial',  cls: 'po-partial'  },
  received: { label: 'Received', cls: 'po-received' },
  cancelled:{ label: 'Cancelled',cls: 'po-cancelled'},
};

const PAYMENT_STATUS = {
  paid:   { label: 'Paid',   cls: 'po-pay-paid'   },
  unpaid: { label: 'Unpaid', cls: 'po-pay-unpaid' },
};

const ADD_INPUT_STYLE = {
  flex: 1, padding: '7px 10px', border: '1px solid #E5E7EB',
  borderRadius: 6, fontSize: 13, fontFamily: 'inherit',
  color: '#111827', background: '#fff', outline: 'none',
};

function poTotal(po) {
  return po.items.reduce((s, i) => s + i.qty * i.unitCost, 0);
}

function blankLine() {
  return { product: PRODUCTS_LIST[0].name, sku: PRODUCTS_LIST[0].sku, qty: 1, unitCost: PRODUCTS_LIST[0].cost };
}

// ── Main component ─────────────────────────────────────────────────
export default function PurchaseOrders() {
  const [search,     setSearch]     = useState('');
  const [statusFilt, setStatusFilt] = useState('All');
  const [expanded,   setExpanded]   = useState(null);
  const [showNew,    setShowNew]    = useState(false);

  // Supplier state
  const [suppliers,       setSuppliers]      = useState(DEFAULT_SUPPLIERS);
  const [formSupplier,    setFormSupplier]   = useState(DEFAULT_SUPPLIERS[0]);
  const [newSupplierMode, setNewSupplierMode] = useState(false);
  const [newSupplierInput,setNewSupplierInput]= useState('');

  // Payment terms state
  const [paymentTerms,    setPaymentTerms]   = useState(DEFAULT_TERMS);
  const [formTerm,        setFormTerm]       = useState(DEFAULT_TERMS[0]);
  const [newTermMode,     setNewTermMode]    = useState(false);
  const [newTermInput,    setNewTermInput]   = useState('');

  // Other form fields
  const [formDate,     setFormDate]     = useState('2025-06-09');
  const [formDelivery, setFormDelivery] = useState('2025-06-16');
  const [formRef,      setFormRef]      = useState('');
  const [formNotes,    setFormNotes]    = useState('');
  const [lineItems,    setLineItems]    = useState([blankLine()]);

  const statuses = ['All', 'Draft', 'Sent', 'Partial', 'Received'];

  const filtered = PURCHASE_ORDERS.filter(po => {
    const matchS = statusFilt === 'All' || po.status === statusFilt.toLowerCase();
    const matchQ = po.id.toLowerCase().includes(search.toLowerCase()) ||
                   po.supplier.toLowerCase().includes(search.toLowerCase());
    return matchS && matchQ;
  });

  const totalSpend   = PURCHASE_ORDERS.reduce((s, po) => s + poTotal(po), 0);
  const pendingCount = PURCHASE_ORDERS.filter(po => po.status === 'sent' || po.status === 'partial').length;
  const pendingValue = PURCHASE_ORDERS.filter(po => po.status === 'sent' || po.status === 'partial')
                         .reduce((s, po) => s + poTotal(po), 0);
  const draftCount   = PURCHASE_ORDERS.filter(po => po.status === 'draft').length;

  const formTotal = lineItems.reduce((s, i) => s + i.qty * i.unitCost, 0);

  // Line item helpers
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
        return { ...item, product: value, sku: found?.sku || '', unitCost: found?.cost || 0 };
      }
      return { ...item, [field]: field === 'qty' || field === 'unitCost' ? Number(value) : value };
    }));
  }

  function addSupplier() {
    const name = newSupplierInput.trim();
    if (name) {
      setSuppliers(prev => [...prev, name]);
      setFormSupplier(name);
    }
    setNewSupplierMode(false);
    setNewSupplierInput('');
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

  function resetForm() {
    setFormSupplier(DEFAULT_SUPPLIERS[0]);
    setNewSupplierMode(false); setNewSupplierInput('');
    setFormTerm(DEFAULT_TERMS[0]);
    setNewTermMode(false); setNewTermInput('');
    setFormDate('2025-06-09');
    setFormDelivery('2025-06-16');
    setFormRef('');
    setFormNotes('');
    setLineItems([blankLine()]);
  }

  return (
    <div className="po-page">

      {/* Stat bar */}
      <div className="po-stat-bar">
        <div className="po-stat">
          <div className="po-stat-val">{PURCHASE_ORDERS.length}</div>
          <div className="po-stat-lbl">Total POs</div>
        </div>
        <div className="po-stat-div" />
        <div className="po-stat">
          <div className="po-stat-val">${totalSpend.toLocaleString()}</div>
          <div className="po-stat-lbl">Total spend</div>
        </div>
        <div className="po-stat-div" />
        <div className="po-stat">
          <div className="po-stat-val po-orange">{pendingCount}</div>
          <div className="po-stat-lbl">Awaiting delivery</div>
        </div>
        <div className="po-stat-div" />
        <div className="po-stat">
          <div className="po-stat-val po-orange">${pendingValue.toLocaleString()}</div>
          <div className="po-stat-lbl">Outstanding value</div>
        </div>
        <div className="po-stat-div" />
        <div className="po-stat">
          <div className="po-stat-val po-muted">{draftCount}</div>
          <div className="po-stat-lbl">Drafts</div>
        </div>
        <button className="po-add-btn" onClick={() => setShowNew(true)}>
          + New purchase order
        </button>
      </div>

      {/* Filters */}
      <div className="po-filters">
        <div className="po-search-wrap">
          <svg className="po-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="po-search"
            placeholder="Search by PO number or supplier..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="po-tabs">
          {statuses.map(s => (
            <button
              key={s}
              className={`po-tab ${statusFilt === s ? 'active' : ''}`}
              onClick={() => setStatusFilt(s)}
            >{s}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="po-panel">
        <div className="po-table-head">
          <span>PO Number</span>
          <span>Supplier</span>
          <span>Date</span>
          <span>Expected delivery</span>
          <span>Items</span>
          <span>Total cost</span>
          <span>Payment</span>
          <span>Status</span>
          <span></span>
        </div>

        {filtered.map(po => (
          <div key={po.id}>
            <div
              className={`po-row ${expanded === po.id ? 'expanded' : ''}`}
              onClick={() => setExpanded(expanded === po.id ? null : po.id)}
            >
              <span className="po-id">{po.id}</span>
              <span className="po-supplier">{po.supplier}</span>
              <span className="po-date">{po.date}</span>
              <span className="po-date">{po.expectedDelivery}</span>
              <span className="po-item-count">{po.items.length} items</span>
              <span className="po-total">${poTotal(po).toLocaleString()}</span>
              <span className={`po-badge ${PAYMENT_STATUS[po.payment].cls}`}>
                {PAYMENT_STATUS[po.payment].label}
              </span>
              <span className={`po-badge ${PO_STATUS[po.status].cls}`}>
                {PO_STATUS[po.status].label}
              </span>
              <div className="po-actions" onClick={e => e.stopPropagation()}>
                <button className="po-action-btn" title="Edit">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button className="po-action-btn" title="Download PDF">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="12" y1="18" x2="12" y2="12"/>
                    <polyline points="9 15 12 18 15 15"/>
                  </svg>
                </button>
                <button className="po-action-btn po-receive-btn" title="Receive stock">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Expanded detail */}
            {expanded === po.id && (
              <div className="po-detail">
                <div className="po-detail-head">
                  <span className="po-detail-col-lg">Product</span>
                  <span>SKU</span>
                  <span>Qty ordered</span>
                  <span>Unit cost</span>
                  <span>Line total</span>
                </div>
                {po.items.map((item, i) => (
                  <div className="po-detail-row" key={i}>
                    <span className="po-detail-name po-detail-col-lg">{item.name}</span>
                    <span className="po-detail-sku">{item.sku}</span>
                    <span className="po-detail-qty">{item.qty}</span>
                    <span className="po-detail-price">${item.unitCost.toLocaleString()}</span>
                    <span className="po-detail-total">${(item.qty * item.unitCost).toLocaleString()}</span>
                  </div>
                ))}
                <div className="po-detail-footer">
                  <span>Total cost</span>
                  <span className="po-detail-grand">${poTotal(po).toLocaleString()}</span>
                </div>
                <div className="po-detail-actions">
                  {po.status !== 'received' && (
                    <button className="po-btn-outline">Receive stock</button>
                  )}
                  {po.payment === 'unpaid' && (
                    <button className="po-btn-outline">Mark as paid</button>
                  )}
                  <button className="po-btn-outline">Send to supplier</button>
                  <button className="po-btn-primary">Download PDF</button>
                </div>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="po-empty">No purchase orders match your search.</div>
        )}
      </div>

      {/* New PO modal */}
      {showNew && (
        <div className="po-modal-overlay" onClick={() => { setShowNew(false); resetForm(); }}>
          <div className="po-modal" onClick={e => e.stopPropagation()}>
            <div className="po-modal-header">
              <h3>New purchase order</h3>
              <button className="po-modal-close" onClick={() => { setShowNew(false); resetForm(); }}>✕</button>
            </div>

            <div className="po-modal-body">

              {/* Header fields */}
              <div className="po-form-grid">

                {/* Supplier */}
                <div className="po-field po-field-full">
                  <label>Supplier</label>
                  <select
                    value={formSupplier}
                    onChange={e => {
                      if (e.target.value === '__add_new_supplier__') {
                        setNewSupplierMode(true);
                      } else {
                        setFormSupplier(e.target.value);
                        setNewSupplierMode(false);
                      }
                    }}
                  >
                    {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                    <option value="__add_new_supplier__">＋ Add new supplier</option>
                  </select>
                  {newSupplierMode && (
                    <div style={{display:'flex', gap:6, marginTop:6, alignItems:'center'}}>
                      <input
                        autoFocus
                        placeholder="Supplier name"
                        value={newSupplierInput}
                        onChange={e => setNewSupplierInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addSupplier(); if (e.key === 'Escape') { setNewSupplierMode(false); setNewSupplierInput(''); } }}
                        style={ADD_INPUT_STYLE}
                      />
                      <button onClick={addSupplier} style={{padding:'7px 12px', background:'#059669', color:'#fff', border:'none', borderRadius:6, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap'}}>Add</button>
                      <button onClick={() => { setNewSupplierMode(false); setNewSupplierInput(''); }} style={{padding:'7px 10px', background:'none', color:'#6B7280', border:'1px solid #E5E7EB', borderRadius:6, fontSize:12, cursor:'pointer', fontFamily:'inherit'}}>Cancel</button>
                    </div>
                  )}
                </div>

                <div className="po-field">
                  <label>Order date</label>
                  <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
                </div>
                <div className="po-field">
                  <label>Expected delivery</label>
                  <input type="date" value={formDelivery} onChange={e => setFormDelivery(e.target.value)} />
                </div>
                <div className="po-field">
                  <label>Reference / PO number</label>
                  <input placeholder="Auto-generated if empty" value={formRef} onChange={e => setFormRef(e.target.value)} />
                </div>

                {/* Payment terms */}
                <div className="po-field">
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
              <div className="po-items-section">
                <div className="po-items-label">Line items</div>
                <div className="po-items-head">
                  <span className="po-col-product">Product</span>
                  <span className="po-col-sku">SKU</span>
                  <span className="po-col-qty">Qty</span>
                  <span className="po-col-cost">Unit cost</span>
                  <span className="po-col-total">Total</span>
                  <span className="po-col-del"></span>
                </div>
                {lineItems.map((item, idx) => (
                  <div className="po-item-row" key={idx}>
                    <select
                      className="po-col-product"
                      value={item.product}
                      onChange={e => updateLineItem(idx, 'product', e.target.value)}
                    >
                      {PRODUCTS_LIST.map(p => <option key={p.sku} value={p.name}>{p.name}</option>)}
                    </select>
                    <span className="po-col-sku po-sku-label">{item.sku}</span>
                    <input
                      className="po-col-qty"
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={e => updateLineItem(idx, 'qty', e.target.value)}
                    />
                    <input
                      className="po-col-cost"
                      type="number"
                      value={item.unitCost}
                      onChange={e => updateLineItem(idx, 'unitCost', e.target.value)}
                    />
                    <span className="po-col-total po-line-total">
                      ${(item.qty * item.unitCost).toLocaleString()}
                    </span>
                    <button
                      className="po-col-del po-del-btn"
                      onClick={() => removeLineItem(idx)}
                      disabled={lineItems.length === 1}
                    >×</button>
                  </div>
                ))}
                <button className="po-add-line" onClick={addLineItem}>
                  + Add line item
                </button>
              </div>

              {/* Notes */}
              <div className="po-field" style={{marginTop: 16}}>
                <label>Notes to supplier</label>
                <textarea
                  className="po-textarea"
                  placeholder="Delivery instructions, special requirements..."
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  rows={2}
                />
              </div>

            </div>

            <div className="po-modal-footer">
              <div className="po-footer-total">
                Total: <strong>${formTotal.toLocaleString()}</strong>
              </div>
              <div className="po-footer-actions">
                <button className="po-btn-outline" onClick={() => { setShowNew(false); resetForm(); }}>
                  Cancel
                </button>
                <button className="po-btn-outline">
                  Save as draft
                </button>
                <button className="po-btn-primary">
                  Create &amp; send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
