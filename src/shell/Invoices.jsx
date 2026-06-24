import { useState } from 'react';
import './Invoices.css';
import { downloadInvoicePDF } from '../api/invoices.js';

// ── Data ───────────────────────────────────────────────────────────
const INVOICES = [
  {
    id: 'INV-00041', orderId: 'SO-0041', customer: 'Kasem Construction',
    date: '2025-06-09', due: '2025-06-23', status: 'unpaid',
    items: [
      { name: 'Cable 2.5mm (100m roll)', qty: 10, price: 1200 },
      { name: 'Drain Cover 300×300mm',   qty: 20, price: 290  },
      { name: 'Steel Conduit 20mm (3m)', qty: 15, price: 150  },
    ],
    tax: 0.07, notes: 'Payment via bank transfer or PromptPay'
  },
  {
    id: 'INV-00040', orderId: 'SO-0040', customer: 'Phuket Build Ltd.',
    date: '2025-06-08', due: '2025-06-22', status: 'unpaid',
    items: [
      { name: 'Cable 4mm (100m roll)', qty: 5,  price: 1800 },
      { name: 'PVC Junction Box 4"',   qty: 40, price: 75   },
    ],
    tax: 0.07, notes: ''
  },
  {
    id: 'INV-00039', orderId: 'SO-0039', customer: 'Central Hardware',
    date: '2025-06-07', due: '2025-06-21', status: 'paid',
    items: [
      { name: 'Cable 6mm (100m roll)',  qty: 8,  price: 2500 },
      { name: 'Cable Tray 100mm (2m)', qty: 30, price: 420  },
      { name: 'Gland Plate 150×150mm', qty: 50, price: 110  },
    ],
    tax: 0.07, notes: ''
  },
  {
    id: 'INV-00038', orderId: 'SO-0038', customer: 'Nonthaburi Works',
    date: '2025-06-06', due: '2025-06-20', status: 'overdue',
    items: [
      { name: 'Drain Cover 450×450mm',   qty: 25, price: 490 },
      { name: 'Steel Conduit 25mm (3m)', qty: 10, price: 185 },
    ],
    tax: 0.07, notes: 'Net 14 payment terms'
  },
  {
    id: 'INV-00037', orderId: 'SO-0037', customer: 'Siam Industrial',
    date: '2025-06-05', due: '2025-06-19', status: 'paid',
    items: [
      { name: 'Cable 2.5mm (100m roll)', qty: 20, price: 1200 },
      { name: 'PVC Junction Box 4"',     qty: 60, price: 75   },
    ],
    tax: 0.07, notes: ''
  },
  {
    id: 'INV-00036', orderId: 'SO-0036', customer: 'BKK Contractors',
    date: '2025-06-04', due: '2025-06-18', status: 'overdue',
    items: [
      { name: 'Steel Conduit 20mm (3m)', qty: 40, price: 150 },
      { name: 'Gland Plate 150×150mm',   qty: 30, price: 110 },
    ],
    tax: 0.07, notes: ''
  },
];

const STATUS = {
  paid:    { label: 'Paid',    cls: 'inv-paid'    },
  unpaid:  { label: 'Unpaid',  cls: 'inv-unpaid'  },
  overdue: { label: 'Overdue', cls: 'inv-overdue' },
};

function subtotal(inv) {
  return inv.items.reduce((s, i) => s + i.qty * i.price, 0);
}

function total(inv) {
  const sub = subtotal(inv);
  return sub + sub * inv.tax;
}

// ── Invoice preview component ──────────────────────────────────────
function InvoicePreview({ inv, onClose }) {
  const sub = subtotal(inv);
  const tax = sub * inv.tax;
  const tot = sub + tax;

  return (
    <div className="inv-preview-overlay" onClick={onClose}>
      <div className="inv-preview" onClick={e => e.stopPropagation()}>
        <div className="inv-preview-topbar">
          <span className="inv-preview-label">Invoice Preview</span>
          <div className="inv-preview-actions">
            <button className="inv-action-pill">✉ Send by email</button>
            <button className="inv-action-pill inv-action-primary" onClick={() => downloadInvoicePDF(inv.id)}>↓ Download PDF</button>
            <button className="inv-preview-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="inv-doc">
          {/* Header */}
          <div className="inv-doc-header">
            <div className="inv-doc-company">
              <div className="inv-doc-logo">
                <svg width="20" height="20" viewBox="0 0 36 36" fill="none">
                  <rect width="36" height="36" rx="6" fill="#059669"/>
                  <rect x="7" y="9"  width="22" height="3" rx="1.5" fill="white"/>
                  <rect x="7" y="16" width="15" height="3" rx="1.5" fill="white" opacity="0.7"/>
                  <rect x="7" y="23" width="18" height="3" rx="1.5" fill="white" opacity="0.5"/>
                </svg>
                <span className="inv-doc-biz-name">Somchai Trading Co.</span>
              </div>
              <div className="inv-doc-biz-details">
                123 Sukhumvit Road, Bangkok 10110<br/>
                Tax ID: 0105562012345<br/>
                Tel: +66 2 123 4567
              </div>
            </div>
            <div className="inv-doc-title-block">
              <h1 className="inv-doc-title">INVOICE</h1>
              <div className="inv-doc-number">{inv.id}</div>
            </div>
          </div>

          {/* Bill to + details */}
          <div className="inv-doc-meta">
            <div className="inv-doc-billto">
              <div className="inv-doc-meta-label">Bill to</div>
              <div className="inv-doc-cust-name">{inv.customer}</div>
              <div className="inv-doc-cust-detail">123 Customer Address<br/>Bangkok, Thailand</div>
            </div>
            <div className="inv-doc-details">
              <div className="inv-doc-detail-row">
                <span className="inv-doc-detail-label">Invoice date</span>
                <span className="inv-doc-detail-val">{inv.date}</span>
              </div>
              <div className="inv-doc-detail-row">
                <span className="inv-doc-detail-label">Due date</span>
                <span className="inv-doc-detail-val">{inv.due}</span>
              </div>
              <div className="inv-doc-detail-row">
                <span className="inv-doc-detail-label">Order ref</span>
                <span className="inv-doc-detail-val">{inv.orderId}</span>
              </div>
              <div className="inv-doc-detail-row">
                <span className="inv-doc-detail-label">Status</span>
                <span className={`inv-status-badge ${STATUS[inv.status].cls}`}>
                  {STATUS[inv.status].label}
                </span>
              </div>
            </div>
          </div>

          {/* Line items */}
          <table className="inv-doc-table">
            <thead>
              <tr>
                <th style={{textAlign:'left'}}>Description</th>
                <th>Qty</th>
                <th>Unit price</th>
                <th style={{textAlign:'right'}}>Total</th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((item, i) => (
                <tr key={i}>
                  <td className="inv-doc-item-name">{item.name}</td>
                  <td className="inv-doc-center">{item.qty}</td>
                  <td className="inv-doc-center">${item.price.toLocaleString()}</td>
                  <td className="inv-doc-right">${(item.qty * item.price).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="inv-doc-totals">
            <div className="inv-doc-total-row">
              <span>Subtotal</span>
              <span>${sub.toLocaleString()}</span>
            </div>
            <div className="inv-doc-total-row">
              <span>VAT (7%)</span>
              <span>${tax.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
            </div>
            <div className="inv-doc-total-row inv-doc-grand">
              <span>Total due</span>
              <span>${tot.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
            </div>
          </div>

          {/* Payment details */}
          <div className="inv-doc-payment">
            <div className="inv-doc-payment-title">Payment details</div>
            <div className="inv-doc-payment-grid">
              <div className="inv-doc-pay-row"><span>Bank</span><span>Kasikorn Bank</span></div>
              <div className="inv-doc-pay-row"><span>Account</span><span>123-4-56789-0</span></div>
              <div className="inv-doc-pay-row"><span>Name</span><span>Somchai Trading Co. Ltd.</span></div>
              <div className="inv-doc-pay-row"><span>PromptPay</span><span>0891234567</span></div>
            </div>
          </div>

          {inv.notes && (
            <div className="inv-doc-notes">
              <div className="inv-doc-notes-label">Notes</div>
              <div className="inv-doc-notes-text">{inv.notes}</div>
            </div>
          )}

          {inv.status === 'paid' && (
            <div className="inv-paid-stamp">PAID</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────
export default function Invoices() {
  const [search,    setSearch]    = useState('');
  const [statusFil, setStatusFil] = useState('All');
  const [preview,   setPreview]   = useState(null);

  const statuses = ['All', 'Unpaid', 'Paid', 'Overdue'];

  const filtered = INVOICES.filter(inv => {
    const matchS = statusFil === 'All' ||
                   inv.status === statusFil.toLowerCase();
    const matchQ = inv.id.toLowerCase().includes(search.toLowerCase()) ||
                   inv.customer.toLowerCase().includes(search.toLowerCase());
    return matchS && matchQ;
  });

  const totalOutstanding = INVOICES
    .filter(i => i.status !== 'paid')
    .reduce((s, i) => s + total(i), 0);
  const totalOverdue = INVOICES
    .filter(i => i.status === 'overdue')
    .reduce((s, i) => s + total(i), 0);
  const totalPaid = INVOICES
    .filter(i => i.status === 'paid')
    .reduce((s, i) => s + total(i), 0);
  const overdueCount = INVOICES.filter(i => i.status === 'overdue').length;

  return (
    <div className="inv-page">

      {/* Stat bar */}
      <div className="inv-stat-bar">
        <div className="inv-stat">
          <div className="inv-stat-val">{INVOICES.length}</div>
          <div className="inv-stat-lbl">Total invoices</div>
        </div>
        <div className="inv-stat-div" />
        <div className="inv-stat">
          <div className="inv-stat-val inv-orange">${totalOutstanding.toLocaleString(undefined,{maximumFractionDigits:0})}</div>
          <div className="inv-stat-lbl">Outstanding</div>
        </div>
        <div className="inv-stat-div" />
        <div className="inv-stat">
          <div className="inv-stat-val inv-red">${totalOverdue.toLocaleString(undefined,{maximumFractionDigits:0})}</div>
          <div className="inv-stat-lbl">Overdue ({overdueCount})</div>
        </div>
        <div className="inv-stat-div" />
        <div className="inv-stat">
          <div className="inv-stat-val inv-green">${totalPaid.toLocaleString(undefined,{maximumFractionDigits:0})}</div>
          <div className="inv-stat-lbl">Collected this month</div>
        </div>
      </div>

      {/* Filters */}
      <div className="inv-filters">
        <div className="inv-search-wrap">
          <svg className="inv-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="inv-search"
            placeholder="Search by invoice ID or customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="inv-tabs">
          {statuses.map(s => (
            <button
              key={s}
              className={`inv-tab ${statusFil === s ? 'active' : ''}`}
              onClick={() => setStatusFil(s)}
            >{s}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="inv-panel">
        <div className="inv-table-head">
          <span>Invoice</span>
          <span>Customer</span>
          <span>Order ref</span>
          <span>Date</span>
          <span>Due date</span>
          <span>Subtotal</span>
          <span>VAT</span>
          <span>Total</span>
          <span>Status</span>
          <span></span>
        </div>

        {filtered.map(inv => (
          <div
            className="inv-row"
            key={inv.id}
            onClick={() => setPreview(inv)}
          >
            <span className="inv-id">{inv.id}</span>
            <span className="inv-customer">{inv.customer}</span>
            <span className="inv-orderref">{inv.orderId}</span>
            <span className="inv-date">{inv.date}</span>
            <span className={`inv-date ${inv.status === 'overdue' ? 'inv-date-overdue' : ''}`}>
              {inv.due}
            </span>
            <span className="inv-amount">${subtotal(inv).toLocaleString()}</span>
            <span className="inv-tax-amt">
              ${(subtotal(inv) * inv.tax).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
            </span>
            <span className="inv-total-amt">
              ${total(inv).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
            </span>
            <span className={`inv-status-badge ${STATUS[inv.status].cls}`}>
              {STATUS[inv.status].label}
            </span>
            <div className="inv-row-actions" onClick={e => e.stopPropagation()}>
              <button
                className="inv-action-btn"
                title="Preview"
                onClick={() => setPreview(inv)}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
              <button className="inv-action-btn" title="Download PDF" onClick={() => downloadInvoicePDF(inv.id)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </button>
              <button className="inv-action-btn" title="Send by email">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </button>
              {inv.status !== 'paid' && (
                <button className="inv-action-btn inv-mark-paid" title="Mark as paid">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="inv-empty">No invoices match your search.</div>
        )}
      </div>

      {/* Invoice preview */}
      {preview && (
        <InvoicePreview inv={preview} onClose={() => setPreview(null)} />
      )}

    </div>
  );
}