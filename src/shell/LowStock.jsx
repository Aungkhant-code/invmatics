import { useState } from 'react';
import './LowStock.css';

// ── Data ───────────────────────────────────────────────────────────
const LOW_STOCK_ITEMS = [
  {
    id: 'P001', name: 'Cable 2.5mm (100m roll)', sku: 'CBL-2.5-100',
    category: 'Cables', stock: 8, reorder: 25, reorderQty: 50,
    supplier: 'Thai Wire Co.', leadDays: 7, cost: 850,
    lastOrdered: '2025-05-20', severity: 'critical'
  },
  {
    id: 'P006', name: 'Steel Conduit 20mm (3m)', sku: 'CDT-20-3M',
    category: 'Conduits', stock: 3, reorder: 20, reorderQty: 80,
    supplier: 'Bangkok Steel', leadDays: 5, cost: 95,
    lastOrdered: '2025-05-25', severity: 'critical'
  },
  {
    id: 'P004', name: 'Drain Cover 300×300mm', sku: 'DRN-300-300',
    category: 'Drainage', stock: 12, reorder: 30, reorderQty: 60,
    supplier: 'CM Plastics', leadDays: 4, cost: 180,
    lastOrdered: '2025-05-28', severity: 'low'
  },
  {
    id: 'P008', name: 'PVC Junction Box 4"', sku: 'JBX-PVC-4',
    category: 'Fittings', stock: 18, reorder: 50, reorderQty: 100,
    supplier: 'Thai Wire Co.', leadDays: 7, cost: 45,
    lastOrdered: '2025-05-22', severity: 'low'
  },
  {
    id: 'P002', name: 'Cable 4mm (100m roll)', sku: 'CBL-4-100',
    category: 'Cables', stock: 20, reorder: 20, reorderQty: 30,
    supplier: 'Thai Wire Co.', leadDays: 7, cost: 1250,
    lastOrdered: '2025-06-01', severity: 'warning'
  },
];

const SEVERITY = {
  critical: { label: 'Critical',    cls: 'ls-critical', desc: 'Below 50% of reorder point' },
  low:      { label: 'Low',         cls: 'ls-low',      desc: 'Below reorder point'         },
  warning:  { label: 'At reorder',  cls: 'ls-warning',  desc: 'At reorder point exactly'    },
};

// ── Main component ─────────────────────────────────────────────────
export default function LowStock() {
  const [selected,  setSelected]  = useState([]);
  const [showOrder, setShowOrder] = useState(false);
  const [ordering,  setOrdering]  = useState(null);

  const critical = LOW_STOCK_ITEMS.filter(p => p.severity === 'critical');
  const low      = LOW_STOCK_ITEMS.filter(p => p.severity === 'low');
  const warning  = LOW_STOCK_ITEMS.filter(p => p.severity === 'warning');

  function toggleSelect(id) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function selectAll() {
    setSelected(selected.length === LOW_STOCK_ITEMS.length
      ? [] : LOW_STOCK_ITEMS.map(p => p.id));
  }

  function stockPct(item) {
    return Math.min(100, Math.round((item.stock / item.reorder) * 100));
  }

  function estCost(item) {
    return (item.reorderQty * item.cost).toLocaleString();
  }

  function daysUntilOut(item) {
    // rough estimate — assume current rate
    return item.stock <= 0 ? 0 : Math.round(item.stock * 0.8);
  }

  return (
    <div className="ls-page">

      {/* Stat bar */}
      <div className="ls-stat-bar">
        <div className="ls-stat">
          <div className="ls-stat-val ls-red">{critical.length}</div>
          <div className="ls-stat-lbl">Critical</div>
        </div>
        <div className="ls-stat-div" />
        <div className="ls-stat">
          <div className="ls-stat-val ls-orange">{low.length}</div>
          <div className="ls-stat-lbl">Low stock</div>
        </div>
        <div className="ls-stat-div" />
        <div className="ls-stat">
          <div className="ls-stat-val ls-yellow">{warning.length}</div>
          <div className="ls-stat-lbl">At reorder point</div>
        </div>
        <div className="ls-stat-div" />
        <div className="ls-stat">
          <div className="ls-stat-val">{LOW_STOCK_ITEMS.length}</div>
          <div className="ls-stat-lbl">Total alerts</div>
        </div>
        <div className="ls-stat-div" />
        <button className="ls-select-all-btn" onClick={selectAll}>
          {selected.length === LOW_STOCK_ITEMS.length ? 'Deselect all' : 'Select all'}
        </button>
        {selected.length > 0 && (
          <>
            <div className="ls-stat-div" />
            <button className="ls-bulk-btn" onClick={() => setShowOrder(true)}>
              Reorder {selected.length} selected →
            </button>
          </>
        )}
      </div>

      {/* Alert sections */}
      {[
        { title: 'Critical',        items: critical, key: 'critical' },
        { title: 'Low Stock',       items: low,      key: 'low'      },
        { title: 'At Reorder Point',items: warning,  key: 'warning'  },
      ].map(section => section.items.length > 0 && (
        <div className="ls-section" key={section.key}>
          <div className="ls-section-header">
            <div className={`ls-section-dot ls-dot-${section.key}`} />
            <h3 className="ls-section-title">{section.title}</h3>
            <span className="ls-section-desc">{SEVERITY[section.key].desc}</span>
            <span className="ls-section-count">{section.items.length} item{section.items.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="ls-panel">
            <div className="ls-table-head">
              <span className="ls-check-col">
                <input
                  type="checkbox"
                  className="ls-checkbox"
                  checked={section.items.every(i => selected.includes(i.id))}
                  onChange={() => {
                    const ids = section.items.map(i => i.id);
                    const allSelected = ids.every(id => selected.includes(id));
                    setSelected(prev => allSelected
                      ? prev.filter(id => !ids.includes(id))
                      : [...new Set([...prev, ...ids])]
                    );
                  }}
                />
              </span>
              <span>Product</span>
              <span>Category</span>
              <span>Stock level</span>
              <span>Supplier</span>
              <span>Lead time</span>
              <span>Reorder qty</span>
              <span>Est. cost</span>
              <span>Last ordered</span>
              <span></span>
            </div>

            {section.items.map(item => (
              <div
                className={`ls-row ${selected.includes(item.id) ? 'ls-selected' : ''}`}
                key={item.id}
              >
                <span className="ls-check-col">
                  <input
                    type="checkbox"
                    className="ls-checkbox"
                    checked={selected.includes(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    onClick={e => e.stopPropagation()}
                  />
                </span>

                <div className="ls-product-cell">
                  <span className="ls-product-name">{item.name}</span>
                  <span className="ls-product-sku">{item.sku}</span>
                </div>

                <span className="ls-category">{item.category}</span>

                {/* Stock level visual */}
                <div className="ls-stock-cell">
                  <div className="ls-stock-numbers">
                    <span className={`ls-stock-current ls-sev-${item.severity}`}>
                      {item.stock}
                    </span>
                    <span className="ls-stock-sep">/</span>
                    <span className="ls-stock-reorder">{item.reorder}</span>
                  </div>
                  <div className="ls-bar-wrap">
                    <div
                      className="ls-bar-fill"
                      style={{
                        width: `${stockPct(item)}%`,
                        background: item.severity === 'critical' ? '#DC2626' :
                                    item.severity === 'low'      ? '#D97706' : '#F59E0B'
                      }}
                    />
                  </div>
                  <span className="ls-stock-pct">{stockPct(item)}%</span>
                  <span className="ls-days-left">~{daysUntilOut(item)}d left</span>
                </div>

                <span className="ls-supplier">{item.supplier}</span>

                <div className="ls-lead-cell">
                  <span className="ls-lead-days">{item.leadDays}d</span>
                  <span className="ls-est-arrival">
                    est. {new Date(Date.now() + item.leadDays * 86400000)
                      .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </div>

                <span className="ls-reorder-qty">{item.reorderQty} units</span>

                <span className="ls-est-cost">${estCost(item)}</span>

                <span className="ls-last-ordered">{item.lastOrdered}</span>

                <div className="ls-row-actions">
                  <button
                    className="ls-reorder-btn"
                    onClick={() => { setOrdering(item); setShowOrder(true); }}
                  >
                    Reorder →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {LOW_STOCK_ITEMS.length === 0 && (
        <div className="ls-all-good">
          <div className="ls-all-good-icon">✓</div>
          <h2>All stock levels are healthy</h2>
          <p>No products are below their reorder points.</p>
        </div>
      )}

      {/* Reorder modal */}
      {showOrder && (
        <div className="ls-modal-overlay" onClick={() => { setShowOrder(false); setOrdering(null); }}>
          <div className="ls-modal" onClick={e => e.stopPropagation()}>
            <div className="ls-modal-header">
              <h3>
                {ordering
                  ? `Reorder — ${ordering.name}`
                  : `Bulk reorder (${selected.length} products)`}
              </h3>
              <button className="ls-modal-close" onClick={() => { setShowOrder(false); setOrdering(null); }}>✕</button>
            </div>
            <div className="ls-modal-body">
              {(ordering ? [ordering] : LOW_STOCK_ITEMS.filter(p => selected.includes(p.id))).map(item => (
                <div className="ls-order-item" key={item.id}>
                  <div className="ls-order-item-info">
                    <span className="ls-order-item-name">{item.name}</span>
                    <span className="ls-order-item-sku">{item.sku}</span>
                  </div>
                  <div className="ls-order-item-fields">
                    <div className="ls-order-field">
                      <label>Supplier</label>
                      <input defaultValue={item.supplier} placeholder="Supplier name" />
                    </div>
                    <div className="ls-order-field">
                      <label>Quantity</label>
                      <input type="number" defaultValue={item.reorderQty} />
                    </div>
                    <div className="ls-order-field">
                      <label>Unit cost</label>
                      <input type="number" defaultValue={item.cost} />
                    </div>
                    <div className="ls-order-est">
                      Est. total: <strong>${(item.reorderQty * item.cost).toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="ls-modal-footer">
              <button className="ls-btn-outline" onClick={() => { setShowOrder(false); setOrdering(null); }}>Cancel</button>
              <button className="ls-btn-primary">Create purchase order</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}