import { useState } from 'react';

const PRODUCTS = [
  { id: 'P001', name: 'Cable 2.5mm (100m roll)',  sku: 'CBL-2.5-100',  category: 'Cables',   stock: 8,  reorder: 25, cost: 850,  price: 1200, supplier: 'Thai Wire Co.'  },
  { id: 'P002', name: 'Cable 4mm (100m roll)',    sku: 'CBL-4-100',    category: 'Cables',   stock: 34, reorder: 20, cost: 1250, price: 1800, supplier: 'Thai Wire Co.'  },
  { id: 'P003', name: 'Cable 6mm (100m roll)',    sku: 'CBL-6-100',    category: 'Cables',   stock: 22, reorder: 15, cost: 1800, price: 2500, supplier: 'Thai Wire Co.'  },
  { id: 'P004', name: 'Drain Cover 300×300mm',    sku: 'DRN-300-300',  category: 'Drainage', stock: 12, reorder: 30, cost: 180,  price: 290,  supplier: 'CM Plastics'    },
  { id: 'P005', name: 'Drain Cover 450×450mm',    sku: 'DRN-450-450',  category: 'Drainage', stock: 45, reorder: 20, cost: 320,  price: 490,  supplier: 'CM Plastics'    },
  { id: 'P006', name: 'Steel Conduit 20mm (3m)',  sku: 'CDT-20-3M',    category: 'Conduits', stock: 3,  reorder: 20, cost: 95,   price: 150,  supplier: 'Bangkok Steel'  },
  { id: 'P007', name: 'Steel Conduit 25mm (3m)',  sku: 'CDT-25-3M',    category: 'Conduits', stock: 28, reorder: 15, cost: 120,  price: 185,  supplier: 'Bangkok Steel'  },
  { id: 'P008', name: 'PVC Junction Box 4"',      sku: 'JBX-PVC-4',    category: 'Fittings', stock: 18, reorder: 50, cost: 45,   price: 75,   supplier: 'Thai Wire Co.'  },
  { id: 'P009', name: 'Cable Tray 100mm (2m)',    sku: 'CTR-100-2M',   category: 'Fittings', stock: 67, reorder: 30, cost: 280,  price: 420,  supplier: 'Bangkok Steel'  },
  { id: 'P010', name: 'Gland Plate 150×150mm',    sku: 'GLP-150-150',  category: 'Fittings', stock: 90, reorder: 40, cost: 65,   price: 110,  supplier: 'CM Plastics'    },
];

const DEFAULT_CATEGORIES = ['Cables', 'Drainage', 'Conduits', 'Fittings'];

const CHEVRON_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`;

export default function Products() {
  const [search,      setSearch]      = useState('');
  const [category,    setCategory]    = useState('All');
  const [selected,    setSelected]    = useState(null);
  const [showAdd,     setShowAdd]     = useState(false);
  const [categories,  setCategories]  = useState(DEFAULT_CATEGORIES);
  const [formCat,     setFormCat]     = useState('Cables');
  const [addingCat,   setAddingCat]   = useState(false);
  const [newCatInput, setNewCatInput] = useState('');

  const filtered = PRODUCTS.filter(p => {
    const matchCat = category === 'All' || p.category === category;
    const matchQ   = p.name.toLowerCase().includes(search.toLowerCase()) ||
                     p.sku.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchQ;
  });

  const lowStock  = PRODUCTS.filter(p => p.stock <= p.reorder).length;
  const totalVal  = PRODUCTS.reduce((s, p) => s + p.stock * p.cost, 0);

  function margin(p) {
    return (((p.price - p.cost) / p.price) * 100).toFixed(1);
  }

  function stockStatus(p) {
    if (p.stock === 0)        return { cls: 'out', label: 'Out of stock' };
    if (p.stock <= p.reorder) return { cls: 'low', label: 'Low stock'    };
    return                           { cls: 'ok',  label: 'In stock'     };
  }

  function handleCategoryChange(e) {
    if (e.target.value === '__new__') {
      setAddingCat(true);
      setFormCat('Cables');
    } else {
      setFormCat(e.target.value);
    }
  }

  function confirmNewCategory() {
    const trimmed = newCatInput.trim();
    if (!trimmed) return;
    if (!categories.includes(trimmed)) setCategories(prev => [...prev, trimmed]);
    setFormCat(trimmed);
    setAddingCat(false);
    setNewCatInput('');
  }

  function closeAdd() {
    setShowAdd(false);
    setAddingCat(false);
    setNewCatInput('');
  }

  return (
    <div className="im-products">

      <div className="im-prod-stats">
        <div className="im-prod-stat">
          <div className="im-prod-stat-val">{PRODUCTS.length}</div>
          <div className="im-prod-stat-lbl">Total SKUs</div>
        </div>
        <div className="im-prod-stat-div" />
        <div className="im-prod-stat">
          <div className="im-prod-stat-val red">{lowStock}</div>
          <div className="im-prod-stat-lbl">Low stock alerts</div>
        </div>
        <div className="im-prod-stat-div" />
        <div className="im-prod-stat">
          <div className="im-prod-stat-val">${totalVal.toLocaleString()}</div>
          <div className="im-prod-stat-lbl">Total stock value</div>
        </div>
        <div className="im-prod-stat-div" />
        <div className="im-prod-stat">
          <div className="im-prod-stat-val">{categories.length}</div>
          <div className="im-prod-stat-lbl">Categories</div>
        </div>
        <button className="im-add-btn" onClick={() => setShowAdd(true)}>+ Add product</button>
      </div>

      <div className="im-prod-filters">
        <div className="im-search-wrap">
          <svg className="im-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="im-search"
            placeholder="Search by name or SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="im-cat-tabs">
          {['All', ...categories].map(c => (
            <button
              key={c}
              className={`im-cat-tab ${category === c ? 'active' : ''}`}
              onClick={() => setCategory(c)}
            >{c}</button>
          ))}
        </div>
      </div>

      <div className="im-panel">
        <div className="im-prod-table-head">
          <span>Product</span><span>SKU</span><span>Category</span>
          <span>Stock</span><span>Cost</span><span>Price</span>
          <span>Margin</span><span>Status</span><span></span>
        </div>
        {filtered.map(p => {
          const st = stockStatus(p);
          return (
            <div
              className={`im-prod-row ${selected === p.id ? 'selected' : ''}`}
              key={p.id}
              onClick={() => setSelected(selected === p.id ? null : p.id)}
            >
              <div className="im-prod-name-cell">
                <div className="im-prod-name">{p.name}</div>
                <div className="im-prod-supplier">{p.supplier}</div>
              </div>
              <span className="im-prod-sku">{p.sku}</span>
              <span className="im-prod-cat">{p.category}</span>
              <div className="im-prod-stock-cell">
                <span className={`im-prod-stock-num ${p.stock <= p.reorder ? 'red' : ''}`}>{p.stock}</span>
                <div className="im-stock-bar-wrap">
                  <div className="im-stock-bar" style={{
                    width: `${Math.min(100, (p.stock / (p.reorder * 2)) * 100)}%`,
                    background: p.stock <= p.reorder ? '#EF4444' : '#059669',
                  }} />
                </div>
                <span className="im-reorder-point">/{p.reorder}</span>
              </div>
              <span className="im-prod-cost">${p.cost.toLocaleString()}</span>
              <span className="im-prod-price">${p.price.toLocaleString()}</span>
              <span className={`im-prod-margin ${parseFloat(margin(p)) >= 30 ? 'good' : 'ok'}`}>{margin(p)}%</span>
              <span className={`im-status-badge ${st.cls}`}>{st.label}</span>
              <div className="im-prod-actions">
                <button className="im-action-btn" title="Edit">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button className="im-action-btn reorder" title="Reorder">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 4v6h6M23 20v-6h-6"/>
                    <path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15"/>
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="im-empty">No products match your search.</div>}
      </div>

      {showAdd && (
        <div className="im-modal-overlay" onClick={closeAdd}>
          <div className="im-modal" onClick={e => e.stopPropagation()}>
            <div className="im-modal-header">
              <h3>Add product</h3>
              <button className="im-modal-close" onClick={closeAdd}>✕</button>
            </div>
            <div className="im-modal-body">
              <div className="im-form-grid">
                <div className="im-field">
                  <label>Product name</label>
                  <input placeholder="e.g. Cable 2.5mm (100m roll)" />
                </div>
                <div className="im-field">
                  <label>SKU</label>
                  <input placeholder="e.g. CBL-2.5-100" />
                </div>
                <div className="im-field">
                  <label>Category</label>
                  {addingCat ? (
                    <div className="im-new-cat-row">
                      <input
                        className="im-new-cat-input"
                        placeholder="New category name..."
                        value={newCatInput}
                        onChange={e => setNewCatInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && confirmNewCategory()}
                        autoFocus
                      />
                      <button className="im-new-cat-confirm" onClick={confirmNewCategory}>Add</button>
                      <button className="im-new-cat-cancel" onClick={() => { setAddingCat(false); setNewCatInput(''); setFormCat(categories[0]); }}>✕</button>
                    </div>
                  ) : (
                    <select value={formCat} onChange={handleCategoryChange}>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="__new__">+ Add new category...</option>
                    </select>
                  )}
                </div>
                <div className="im-field">
                  <label>Supplier</label>
                  <input placeholder="Supplier name" />
                </div>
                <div className="im-field">
                  <label>Cost price ($)</label>
                  <input type="number" placeholder="0" />
                </div>
                <div className="im-field">
                  <label>Selling price ($)</label>
                  <input type="number" placeholder="0" />
                </div>
                <div className="im-field">
                  <label>Opening stock</label>
                  <input type="number" placeholder="0" />
                </div>
                <div className="im-field">
                  <label>Reorder point</label>
                  <input type="number" placeholder="0" />
                </div>
              </div>
            </div>
            <div className="im-modal-footer">
              <button className="im-btn-secondary" onClick={closeAdd}>Cancel</button>
              <button className="im-btn-primary">Add product</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
