import { useState } from 'react';
import './StockMovements.css';

// ── Data ───────────────────────────────────────────────────────────
const MOVEMENTS = [
  { id: 'SM-0089', date: '2025-06-09 14:32', product: 'Cable 2.5mm (100m roll)', sku: 'CBL-2.5-100', type: 'sale',     qty: -10, before: 18,  after: 8,   ref: 'SO-0041', user: 'Somchai K.',  notes: ''                        },
  { id: 'SM-0088', date: '2025-06-09 11:15', product: 'Drain Cover 300×300mm',   sku: 'DRN-300-300', type: 'sale',     qty: -20, before: 32,  after: 12,  ref: 'SO-0041', user: 'Somchai K.',  notes: ''                        },
  { id: 'SM-0087', date: '2025-06-08 16:44', product: 'Cable 4mm (100m roll)',   sku: 'CBL-4-100',   type: 'receive',  qty: +30, before: 4,   after: 34,  ref: 'PO-0021', user: 'Wichai P.',   notes: 'Delivery from Thai Wire' },
  { id: 'SM-0086', date: '2025-06-08 10:20', product: 'Drain Cover 450×450mm',  sku: 'DRN-450-450', type: 'receive',  qty: +40, before: 5,   after: 45,  ref: 'PO-0020', user: 'Wichai P.',   notes: ''                        },
  { id: 'SM-0085', date: '2025-06-07 15:55', product: 'Cable 6mm (100m roll)',   sku: 'CBL-6-100',   type: 'sale',     qty: -8,  before: 30,  after: 22,  ref: 'SO-0039', user: 'Somchai K.',  notes: ''                        },
  { id: 'SM-0084', date: '2025-06-07 09:30', product: 'Steel Conduit 20mm (3m)', sku: 'CDT-20-3M',   type: 'damage',   qty: -5,  before: 8,   after: 3,   ref: '',        user: 'Wichai P.',   notes: 'Water damage in warehouse bay 3' },
  { id: 'SM-0083', date: '2025-06-06 17:10', product: 'PVC Junction Box 4"',     sku: 'JBX-PVC-4',   type: 'sale',     qty: -40, before: 58,  after: 18,  ref: 'SO-0040', user: 'Somchai K.',  notes: ''                        },
  { id: 'SM-0082', date: '2025-06-06 11:45', product: 'Cable Tray 100mm (2m)',   sku: 'CTR-100-2M',  type: 'receive',  qty: +50, before: 17,  after: 67,  ref: 'PO-0019', user: 'Wichai P.',   notes: 'Partial delivery'        },
  { id: 'SM-0081', date: '2025-06-05 14:20', product: 'Gland Plate 150×150mm',  sku: 'GLP-150-150', type: 'adjust',   qty: +8,  before: 82,  after: 90,  ref: '',        user: 'Admin',       notes: 'Stock count correction'  },
  { id: 'SM-0080', date: '2025-06-05 09:00', product: 'Cable 2.5mm (100m roll)', sku: 'CBL-2.5-100', type: 'sale',     qty: -20, before: 38,  after: 18,  ref: 'SO-0037', user: 'Somchai K.',  notes: ''                        },
  { id: 'SM-0079', date: '2025-06-04 16:30', product: 'Steel Conduit 25mm (3m)', sku: 'CDT-25-3M',   type: 'receive',  qty: +50, before: 28,  after: 28,  ref: 'PO-0019', user: 'Wichai P.',   notes: ''                        },
  { id: 'SM-0078', date: '2025-06-04 13:15', product: 'Drain Cover 300×300mm',   sku: 'DRN-300-300', type: 'theft',    qty: -3,  before: 35,  after: 32,  ref: '',        user: 'Admin',       notes: 'Reported missing after stocktake' },
];

const MOVEMENT_TYPES = {
  sale:    { label: 'Sale',       cls: 'mt-sale',    icon: '↓', color: '#DC2626' },
  receive: { label: 'Received',   cls: 'mt-receive', icon: '↑', color: '#059669' },
  adjust:  { label: 'Adjustment', cls: 'mt-adjust',  icon: '~', color: '#2563EB' },
  damage:  { label: 'Damage',     cls: 'mt-damage',  icon: '✕', color: '#D97706' },
  theft:   { label: 'Theft',      cls: 'mt-theft',   icon: '!', color: '#7C3AED' },
  return:  { label: 'Return',     cls: 'mt-return',  icon: '↩', color: '#059669' },
};

const PRODUCTS_LIST = [
  'Cable 2.5mm (100m roll)',
  'Cable 4mm (100m roll)',
  'Cable 6mm (100m roll)',
  'Drain Cover 300×300mm',
  'Drain Cover 450×450mm',
  'Steel Conduit 20mm (3m)',
  'Steel Conduit 25mm (3m)',
  'PVC Junction Box 4"',
  'Cable Tray 100mm (2m)',
  'Gland Plate 150×150mm',
];

// ── Main component ─────────────────────────────────────────────────
export default function StockMovements() {
  const [search,   setSearch]   = useState('');
  const [typeFilt, setTypeFilt] = useState('All');
  const [showAdj,  setShowAdj]  = useState(false);
  const [adjType,  setAdjType]  = useState('adjust');
  const [adjProd,  setAdjProd]  = useState(PRODUCTS_LIST[0]);
  const [adjQty,   setAdjQty]   = useState('');
  const [adjNotes, setAdjNotes] = useState('');

  const types = ['All', 'Sale', 'Received', 'Adjustment', 'Damage', 'Theft', 'Return'];

  const filtered = MOVEMENTS.filter(m => {
    const matchT = typeFilt === 'All' ||
      MOVEMENT_TYPES[m.type]?.label === typeFilt;
    const matchQ = m.product.toLowerCase().includes(search.toLowerCase()) ||
                   m.sku.toLowerCase().includes(search.toLowerCase()) ||
                   m.ref.toLowerCase().includes(search.toLowerCase());
    return matchT && matchQ;
  });

  const totalIn  = MOVEMENTS.filter(m => m.qty > 0).reduce((s, m) => s + m.qty, 0);
  const totalOut = MOVEMENTS.filter(m => m.qty < 0).reduce((s, m) => s + Math.abs(m.qty), 0);
  const damages  = MOVEMENTS.filter(m => m.type === 'damage' || m.type === 'theft').length;
  const adjusts  = MOVEMENTS.filter(m => m.type === 'adjust').length;

  return (
    <div className="sm-page">

      {/* Stat bar */}
      <div className="sm-stat-bar">
        <div className="sm-stat">
          <div className="sm-stat-val">{MOVEMENTS.length}</div>
          <div className="sm-stat-lbl">Total movements</div>
        </div>
        <div className="sm-stat-div" />
        <div className="sm-stat">
          <div className="sm-stat-val sm-green">+{totalIn}</div>
          <div className="sm-stat-lbl">Units received</div>
        </div>
        <div className="sm-stat-div" />
        <div className="sm-stat">
          <div className="sm-stat-val sm-red">-{totalOut}</div>
          <div className="sm-stat-lbl">Units dispatched</div>
        </div>
        <div className="sm-stat-div" />
        <div className="sm-stat">
          <div className="sm-stat-val sm-orange">{damages}</div>
          <div className="sm-stat-lbl">Damage / theft</div>
        </div>
        <div className="sm-stat-div" />
        <div className="sm-stat">
          <div className="sm-stat-val sm-blue">{adjusts}</div>
          <div className="sm-stat-lbl">Adjustments</div>
        </div>
        <button className="sm-add-btn" onClick={() => setShowAdj(true)}>
          + Record adjustment
        </button>
      </div>

      {/* Filters */}
      <div className="sm-filters">
        <div className="sm-search-wrap">
          <svg className="sm-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="sm-search"
            placeholder="Search product, SKU or reference..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="sm-tabs">
          {types.map(t => (
            <button
              key={t}
              className={`sm-tab ${typeFilt === t ? 'active' : ''}`}
              onClick={() => setTypeFilt(t)}
            >{t}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="sm-panel">
        <div className="sm-table-head">
          <span>ID</span>
          <span>Date & time</span>
          <span>Product</span>
          <span>Type</span>
          <span>Change</span>
          <span>Before</span>
          <span>After</span>
          <span>Reference</span>
          <span>User</span>
          <span>Notes</span>
        </div>

        {filtered.map(m => {
          const mt = MOVEMENT_TYPES[m.type];
          return (
            <div className="sm-row" key={m.id}>
              <span className="sm-id">{m.id}</span>
              <span className="sm-date">{m.date}</span>
              <div className="sm-product-cell">
                <span className="sm-product-name">{m.product}</span>
                <span className="sm-product-sku">{m.sku}</span>
              </div>
              <span className={`sm-type-badge ${mt.cls}`}>
                <span className="sm-type-icon">{mt.icon}</span>
                {mt.label}
              </span>
              <span className={`sm-qty ${m.qty > 0 ? 'sm-qty-pos' : 'sm-qty-neg'}`}>
                {m.qty > 0 ? `+${m.qty}` : m.qty}
              </span>
              <span className="sm-stock-num">{m.before}</span>
              <span className={`sm-stock-num ${m.after <= 15 ? 'sm-low' : ''}`}>{m.after}</span>
              <span className="sm-ref">{m.ref || '—'}</span>
              <span className="sm-user">{m.user}</span>
              <span className="sm-notes">{m.notes || '—'}</span>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="sm-empty">No movements match your search.</div>
        )}
      </div>

      {/* Record adjustment modal */}
      {showAdj && (
        <div className="sm-modal-overlay" onClick={() => setShowAdj(false)}>
          <div className="sm-modal" onClick={e => e.stopPropagation()}>
            <div className="sm-modal-header">
              <h3>Record stock movement</h3>
              <button className="sm-modal-close" onClick={() => setShowAdj(false)}>✕</button>
            </div>
            <div className="sm-modal-body">

              {/* Type selector */}
              <div className="sm-type-selector">
                {['adjust', 'damage', 'theft', 'return'].map(t => (
                  <button
                    key={t}
                    className={`sm-type-pill ${adjType === t ? 'active' : ''}`}
                    style={adjType === t ? { background: MOVEMENT_TYPES[t].color, borderColor: MOVEMENT_TYPES[t].color } : {}}
                    onClick={() => setAdjType(t)}
                  >
                    <span>{MOVEMENT_TYPES[t].icon}</span>
                    {MOVEMENT_TYPES[t].label}
                  </button>
                ))}
              </div>

              <div className="sm-form-grid">
                <div className="sm-field sm-field-full">
                  <label>Product</label>
                  <select value={adjProd} onChange={e => setAdjProd(e.target.value)}>
                    {PRODUCTS_LIST.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="sm-field">
                  <label>
                    {adjType === 'adjust' ? 'Quantity change (+ or -)' :
                     adjType === 'return' ? 'Quantity returned' :
                     'Quantity lost'}
                  </label>
                  <input
                    type="number"
                    placeholder={adjType === 'adjust' ? 'e.g. -5 or +10' : 'e.g. 3'}
                    value={adjQty}
                    onChange={e => setAdjQty(e.target.value)}
                  />
                </div>
                <div className="sm-field">
                  <label>Reference (optional)</label>
                  <input placeholder="e.g. PO number, incident report..." />
                </div>
                <div className="sm-field sm-field-full">
                  <label>Notes</label>
                  <textarea
                    className="sm-textarea"
                    placeholder={
                      adjType === 'damage'  ? 'Describe the damage...' :
                      adjType === 'theft'   ? 'Describe the incident...' :
                      adjType === 'return'  ? 'Return reason...' :
                      'Reason for adjustment...'
                    }
                    value={adjNotes}
                    onChange={e => setAdjNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              {adjType !== 'adjust' && (
                <div className="sm-warning">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  This movement will reduce your stock count and cannot be undone.
                </div>
              )}

            </div>
            <div className="sm-modal-footer">
              <button className="sm-btn-outline" onClick={() => setShowAdj(false)}>Cancel</button>
              <button className="sm-btn-primary">Record movement</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}