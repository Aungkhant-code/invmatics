import { Icon, ICONS } from './Icon';

function StatCard({ label, value, delta, deltaType, sub, icon, color }) {
  return (
    <div className="im-stat-card">
      <div className="im-stat-header">
        <span className="im-stat-label">{label}</span>
        <span className={`im-stat-icon ${color}`}>
          <Icon d={ICONS[icon]} size={16} />
        </span>
      </div>
      <div className="im-stat-value">{value}</div>
      {delta && (
        <div className={`im-stat-delta ${deltaType}`}>
          {delta}
          {sub && <span className="im-stat-sub"> · {sub}</span>}
        </div>
      )}
    </div>
  );
}

const LOW_STOCK = [
  { name: 'Cable 2.5mm (100m roll)', qty: 8,  min: 25, supplier: 'Thai Wire Co.'  },
  { name: 'Drain Cover 300×300mm',   qty: 12, min: 30, supplier: 'CM Plastics'    },
  { name: 'Steel Conduit 20mm',      qty: 3,  min: 20, supplier: 'Bangkok Steel'  },
  { name: 'PVC Junction Box 4"',     qty: 18, min: 50, supplier: 'Thai Wire Co.'  },
];

const RECENT_ORDERS = [
  { ref: 'SO-0041', customer: 'Kasem Construction', items: 6, total: '$84,500',  status: 'dispatched' },
  { ref: 'SO-0040', customer: 'Phuket Build Ltd.',  items: 3, total: '$32,100',  status: 'pending'    },
  { ref: 'SO-0039', customer: 'Central Hardware',   items: 9, total: '$156,200', status: 'delivered'  },
  { ref: 'SO-0038', customer: 'Nonthaburi Works',   items: 2, total: '$18,750',  status: 'pending'    },
  { ref: 'SO-0037', customer: 'Siam Industrial',    items: 5, total: '$67,300',  status: 'delivered'  },
];

const STATUS = {
  pending:    { label: 'Pending',    cls: 'warn' },
  dispatched: { label: 'Dispatched', cls: 'info' },
  delivered:  { label: 'Delivered',  cls: 'ok'   },
};

const FINANCIALS = [
  { label: 'Total Revenue',     value: '$648,500', note: '↑ 11.4%',       positive: true  },
  { label: 'Cost of Goods',     value: '$459,300', note: '↑ 9.1%',        positive: false },
  { label: 'Gross Profit',      value: '$189,200', note: '29.2% margin',  positive: true  },
  { label: 'Outstanding Recv.', value: '$124,500', note: '4 invoices',    positive: null  },
  { label: 'Stock Purchased',   value: '$312,000', note: '12 POs',        positive: null  },
  { label: 'Overdue Payments',  value: '$38,200',  note: '3 customers',   positive: false },
];

export default function Dashboard() {
  return (
    <div className="im-dashboard">

      <div className="im-stats-grid">
        <StatCard label="Stock Value"     value="$2,840,000" delta="↑ 6.2% vs last month"  deltaType="positive" icon="box"      color="green"  />
        <StatCard label="Revenue (MTD)"   value="$648,500"   delta="↑ 11.4% vs last month" deltaType="positive" icon="trending" color="green"  />
        <StatCard label="Gross Margin"    value="$189,200"   delta="29.2% margin"           deltaType="neutral"  icon="reports"  color="blue"   />
        <StatCard label="Pending Orders"  value="14"         delta="3 overdue"              deltaType="negative" icon="orders"   color="orange" sub="action needed" />
      </div>

      <div className="im-dash-grid">

        <div className="im-panel">
          <div className="im-panel-header">
            <div className="im-panel-title"><span className="im-panel-dot red" />Low Stock Alerts</div>
            <button className="im-panel-link">View all</button>
          </div>
          <div className="im-panel-body">
            {LOW_STOCK.map(row => (
              <div className="im-low-row" key={row.name}>
                <div className="im-low-info">
                  <div className="im-low-name">{row.name}</div>
                  <div className="im-low-supplier">{row.supplier}</div>
                </div>
                <div className="im-low-qty">
                  <span className="im-qty-current">{row.qty}</span>
                  <span className="im-qty-sep">/</span>
                  <span className="im-qty-min">{row.min}</span>
                </div>
                <button className="im-reorder-btn">Reorder →</button>
              </div>
            ))}
          </div>
        </div>

        <div className="im-panel">
          <div className="im-panel-header">
            <div className="im-panel-title"><span className="im-panel-dot green" />Recent Orders</div>
            <button className="im-panel-link">View all</button>
          </div>
          <div className="im-panel-body">
            <div className="im-table-head">
              <span>Reference</span>
              <span>Customer</span>
              <span>Total</span>
              <span>Status</span>
            </div>
            {RECENT_ORDERS.map(row => (
              <div className="im-table-row" key={row.ref}>
                <span className="im-order-ref">{row.ref}</span>
                <span className="im-order-customer">{row.customer}</span>
                <span className="im-order-total">{row.total}</span>
                <span className={`im-status-badge ${STATUS[row.status].cls}`}>
                  {STATUS[row.status].label}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      <div className="im-panel">
        <div className="im-panel-header">
          <div className="im-panel-title"><span className="im-panel-dot blue" />Monthly Financial Summary</div>
          <div className="im-panel-tabs">
            <button className="im-tab active">This month</button>
            <button className="im-tab">Last month</button>
            <button className="im-tab">This year</button>
          </div>
        </div>
        <div className="im-fin-grid">
          {FINANCIALS.map(item => (
            <div className="im-fin-item" key={item.label}>
              <div className="im-fin-label">{item.label}</div>
              <div className="im-fin-value">{item.value}</div>
              <div className={`im-fin-note ${item.positive === true ? 'positive' : item.positive === false ? 'negative' : 'neutral'}`}>
                {item.note}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
