import { useState, useEffect } from 'react';
import { useApi } from '../lib/api';
import { Icon, ICONS } from '../shell/Icon';

function fmt(n, currency = '$') {
  if (n === null || n === undefined) return '—';
  if (n >= 1_000_000) return `${currency}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${currency}${(n / 1_000).toFixed(1)}k`;
  return `${currency}${Number(n).toFixed(2)}`;
}

function StatCard({ label, value, delta, deltaType, sub, icon, color, loading }) {
  return (
    <div className="im-stat-card">
      <div className="im-stat-header">
        <span className="im-stat-label">{label}</span>
        <span className={`im-stat-icon ${color}`}>
          <Icon d={ICONS[icon]} size={16} />
        </span>
      </div>
      {loading
        ? <div className="im-skeleton im-skeleton-value" />
        : <div className="im-stat-value">{value}</div>
      }
      {delta && !loading && (
        <div className={`im-stat-delta ${deltaType}`}>
          {delta}
          {sub && <span className="im-stat-sub"> · {sub}</span>}
        </div>
      )}
    </div>
  );
}

const ORDER_STATUS = {
  draft:      { label: 'Draft',      cls: 'muted' },
  confirmed:  { label: 'Confirmed',  cls: 'info'  },
  dispatched: { label: 'Dispatched', cls: 'blue'  },
  delivered:  { label: 'Delivered',  cls: 'ok'    },
  cancelled:  { label: 'Cancelled',  cls: 'out'   },
};

const SEVERITY_CLS = {
  out:      'out',
  critical: 'out',
  low:      'warn',
  warning:  'warn',
};

export default function Dashboard() {
  const api = useApi();

  const [period,    setPeriod]    = useState('this_month');
  const [summary,   setSummary]   = useState(null);
  const [financial, setFinancial] = useState(null);
  const [lowStock,  setLowStock]  = useState([]);
  const [orders,    setOrders]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [sum, fin, ls, ord] = await Promise.all([
          api.get(`/analytics/summary?period=${period}`),
          api.get(`/analytics/financial-summary?period=${period}`),
          api.get('/inventory/low-stock'),
          api.get('/orders/sales?limit=5'),
        ]);
        if (cancelled) return;
        setSummary(sum);
        setFinancial(fin);
        setLowStock([
          ...(ls.critical || []),
          ...(ls.low      || []),
          ...(ls.warning  || []),
        ].slice(0, 4));
        setOrders((ord.orders || []).slice(0, 5));
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [period, api]);

  const PERIOD_LABELS = {
    this_month:    'This month',
    last_month:    'Last month',
    last_3_months: 'Last 3 months',
    this_year:     'This year',
  };

  const FINANCIALS = financial ? [
    { label: 'Total Revenue',     value: fmt(financial.revenue),               note: `${financial.gross_margin}% margin`,       positive: true  },
    { label: 'Cost of Goods',     value: fmt(financial.cogs),                  note: '',                                         positive: false },
    { label: 'Gross Profit',      value: fmt(financial.gross_profit),          note: `${financial.gross_margin}% margin`,       positive: true  },
    { label: 'Outstanding Recv.', value: fmt(financial.outstanding_receivables),note: `${financial.overdue_count} overdue`,      positive: null  },
    { label: 'Stock Purchased',   value: fmt(financial.stock_purchased),       note: `${financial.po_count} POs`,               positive: null  },
    { label: 'Overdue Payments',  value: fmt(financial.overdue_payments),      note: `${financial.overdue_count} customers`,    positive: false },
  ] : [];

  if (error) {
    return (
      <div className="im-dashboard">
        <div className="im-panel" style={{ padding: 24, color: 'var(--red)' }}>
          Failed to load dashboard: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="im-dashboard">

      {/* Stat cards */}
      <div className="im-stats-grid">
        <StatCard
          label="Stock Value" icon="box" color="green" loading={loading}
          value={fmt(summary?.stock_value)}
          delta={summary ? '↑ live value' : null}
          deltaType="neutral"
        />
        <StatCard
          label="Revenue (MTD)" icon="trending" color="green" loading={loading}
          value={fmt(summary?.revenue)}
          delta={summary?.revenue_delta != null
            ? `${summary.revenue_delta > 0 ? '↑' : '↓'} ${Math.abs(summary.revenue_delta)}% vs last month`
            : null}
          deltaType={summary?.revenue_delta >= 0 ? 'positive' : 'negative'}
        />
        <StatCard
          label="Gross Margin" icon="reports" color="blue" loading={loading}
          value={fmt(summary?.gross_profit)}
          delta={summary?.gross_margin != null ? `${summary.gross_margin}% margin` : null}
          deltaType="neutral"
        />
        <StatCard
          label="Pending Orders" icon="orders" color="orange" loading={loading}
          value={summary?.pending_orders ?? '—'}
          delta={summary?.overdue_count ? `${summary.overdue_count} overdue` : null}
          deltaType="negative"
          sub={summary?.overdue_count ? 'action needed' : null}
        />
      </div>

      {/* Low stock + Recent orders */}
      <div className="im-dash-grid">

        <div className="im-panel">
          <div className="im-panel-header">
            <div className="im-panel-title">
              <span className="im-panel-dot red" />Low Stock Alerts
            </div>
            <button className="im-panel-link">View all</button>
          </div>
          <div className="im-panel-body">
            {loading ? (
              [1,2,3,4].map(i => (
                <div key={i} className="im-low-row">
                  <div className="im-low-info">
                    <div className="im-skeleton" style={{ height: 13, width: '70%', marginBottom: 4 }} />
                    <div className="im-skeleton" style={{ height: 11, width: '40%' }} />
                  </div>
                </div>
              ))
            ) : lowStock.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                All stock levels are healthy
              </div>
            ) : lowStock.map(row => (
              <div className="im-low-row" key={row.id}>
                <div className="im-low-info">
                  <div className="im-low-name">{row.name}</div>
                  <div className="im-low-supplier">
                    {row.suppliers?.name || 'No supplier'} · {row.suppliers?.lead_days ?? '?'} day lead
                  </div>
                </div>
                <div className="im-low-qty">
                  <span className="im-qty-current">{row.qty_on_hand}</span>
                  <span className="im-qty-sep">/</span>
                  <span className="im-qty-min">{row.reorder_point}</span>
                </div>
                <span className={`im-status-badge ${SEVERITY_CLS[row.severity] || 'warn'}`}>
                  {row.severity === 'out' ? 'Out' : 'Low'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="im-panel">
          <div className="im-panel-header">
            <div className="im-panel-title">
              <span className="im-panel-dot green" />Recent Orders
            </div>
            <button className="im-panel-link">View all</button>
          </div>
          <div className="im-panel-body">
            <div className="im-table-head">
              <span>Reference</span>
              <span>Customer</span>
              <span>Total</span>
              <span>Status</span>
            </div>
            {loading ? (
              [1,2,3,4,5].map(i => (
                <div key={i} className="im-table-row">
                  <div className="im-skeleton" style={{ height: 13, width: '80%' }} />
                </div>
              ))
            ) : orders.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No orders yet
              </div>
            ) : orders.map(row => {
              const st = ORDER_STATUS[row.status] || { label: row.status, cls: 'muted' };
              return (
                <div className="im-table-row" key={row.id}>
                  <span className="im-order-ref">{row.order_number}</span>
                  <span className="im-order-customer">{row.customers?.name || '—'}</span>
                  <span className="im-order-total">{fmt(row.total_amount)}</span>
                  <span className={`im-status-badge ${st.cls}`}>{st.label}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Financial summary */}
      <div className="im-panel">
        <div className="im-panel-header">
          <div className="im-panel-title">
            <span className="im-panel-dot blue" />Monthly Financial Summary
          </div>
          <div className="im-panel-tabs">
            {Object.entries(PERIOD_LABELS).map(([key, label]) => (
              <button
                key={key}
                className={`im-tab ${period === key ? 'active' : ''}`}
                onClick={() => setPeriod(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="im-fin-grid">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="im-fin-item">
                <div className="im-skeleton" style={{ height: 11, width: '60%', marginBottom: 8 }} />
                <div className="im-skeleton" style={{ height: 20, width: '80%', marginBottom: 4 }} />
                <div className="im-skeleton" style={{ height: 12, width: '40%' }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="im-fin-grid">
            {FINANCIALS.map(item => (
              <div className="im-fin-item" key={item.label}>
                <div className="im-fin-label">{item.label}</div>
                <div className="im-fin-value">{item.value}</div>
                <div className={`im-fin-note ${
                  item.positive === true  ? 'positive' :
                  item.positive === false ? 'negative' : 'neutral'
                }`}>
                  {item.note}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
