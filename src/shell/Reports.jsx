import { useState } from 'react';
import './Reports.css';

// ── Chart helpers ──────────────────────────────────────────────────
function BarChart({ data, height = 120, color = '#059669' }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="rpt-bar-chart" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="rpt-bar-col">
          <div
            className="rpt-bar"
            style={{
              height: `${(d.value / max) * 100}%`,
              background: color,
              opacity: i === data.length - 1 ? 1 : 0.55
            }}
            title={`${d.label}: ${d.value}`}
          />
          <span className="rpt-bar-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function LineChart({ data, height = 120, color = '#059669' }) {
  const max    = Math.max(...data.map(d => d.value), 1);
  const w      = 200 / (data.length - 1);
  const xMax   = w * (data.length - 1);
  const points = data.map((d, i) => {
    const x = i * w;
    const y = 5 + (1 - d.value / max) * 85;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="rpt-line-chart" style={{ height }}>
      <svg
        viewBox="0 0 200 100"
        preserveAspectRatio="none"
        className="rpt-line-svg"
        style={{ height: height - 24, width: '100%' }}
      >
        <defs>
          <linearGradient id={`grad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`0,100 ${points} ${xMax},100`}
          fill={`url(#grad-${color.replace('#','')})`}
        />
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        {data.map((d, i) => {
          const x = i * w;
          const y = 5 + (1 - d.value / max) * 85;
          return (
            <circle key={i} cx={x} cy={y} r="1.8"
              fill="#fff" stroke={color} strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      <div className="rpt-line-labels">
        {data.map((d, i) => (
          <span key={i} className="rpt-line-label">{d.label}</span>
        ))}
      </div>
    </div>
  );
}

// ── Data ───────────────────────────────────────────────────────────
const MONTHLY_REVENUE = [
  { label: 'Jan', value: 420000 },
  { label: 'Feb', value: 385000 },
  { label: 'Mar', value: 510000 },
  { label: 'Apr', value: 460000 },
  { label: 'May', value: 590000 },
  { label: 'Jun', value: 648500 },
];

const MONTHLY_COGS = [
  { label: 'Jan', value: 298000 },
  { label: 'Feb', value: 276000 },
  { label: 'Mar', value: 362000 },
  { label: 'Apr', value: 325000 },
  { label: 'May', value: 418000 },
  { label: 'Jun', value: 459300 },
];

const TOP_PRODUCTS = [
  { name: 'Cable 6mm (100m roll)',    revenue: 180000, units: 72,  margin: 28 },
  { name: 'Cable 4mm (100m roll)',    revenue: 162000, units: 90,  margin: 31 },
  { name: 'Cable 2.5mm (100m roll)', revenue: 144000, units: 120, margin: 29 },
  { name: 'Cable Tray 100mm (2m)',   revenue: 88200,  units: 210, margin: 33 },
  { name: 'Drain Cover 450×450mm',   revenue: 61250,  units: 125, margin: 36 },
];

const TOP_CUSTOMERS = [
  { name: 'Central Hardware',   revenue: 3100000, orders: 24, avgOrder: 129167 },
  { name: 'Siam Industrial',    revenue: 2400000, orders: 18, avgOrder: 133333 },
  { name: 'Kasem Construction', revenue: 1240000, orders: 12, avgOrder: 103333 },
  { name: 'BKK Contractors',    revenue: 780000,  orders: 9,  avgOrder: 86667  },
  { name: 'Phuket Build Ltd.',  revenue: 680000,  orders: 7,  avgOrder: 97143  },
];

const STOCK_VALUE_TREND = [
  { label: 'Jan', value: 2200000 },
  { label: 'Feb', value: 2350000 },
  { label: 'Mar', value: 2100000 },
  { label: 'Apr', value: 2480000 },
  { label: 'May', value: 2720000 },
  { label: 'Jun', value: 2840000 },
];

const CATEGORY_BREAKDOWN = [
  { name: 'Cables',   value: 58, color: '#059669' },
  { name: 'Conduits', value: 20, color: '#2563EB' },
  { name: 'Drainage', value: 14, color: '#D97706' },
  { name: 'Fittings', value: 8,  color: '#7C3AED' },
];

// ── Donut chart ────────────────────────────────────────────────────
function DonutChart({ data }) {
  const slices = data.map((d, i) => ({
    ...d,
    start: data.slice(0, i).reduce((s, x) => s + x.value, 0),
  }));

  function slice(start, value, color) {
    const r = 15.9;
    const circ = 2 * Math.PI * r;
    const offset = circ - (value / 100) * circ;
    const rotate = (start / 100) * 360 - 90;
    return (
      <circle
        key={color}
        cx="18" cy="18" r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeDasharray={`${circ} ${circ}`}
        strokeDashoffset={offset}
        style={{ transform: `rotate(${rotate}deg)`, transformOrigin: '18px 18px' }}
      />
    );
  }

  return (
    <div className="rpt-donut-wrap">
      <svg viewBox="0 0 36 36" className="rpt-donut-svg">
        {slices.map(d => slice(d.start, d.value, d.color))}
      </svg>
      <div className="rpt-donut-legend">
        {data.map(d => (
          <div key={d.name} className="rpt-donut-item">
            <span className="rpt-donut-dot" style={{ background: d.color }} />
            <span className="rpt-donut-name">{d.name}</span>
            <span className="rpt-donut-pct">{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────
export default function Reports() {
  const [period, setPeriod] = useState('This month');
  const periods = ['This month', 'Last month', 'Last 3 months', 'This year'];

  const currentRevenue  = 648500;
  const currentCOGS     = 459300;
  const currentMargin   = currentRevenue - currentCOGS;
  const marginPct       = ((currentMargin / currentRevenue) * 100).toFixed(1);
  const revenueGrowth   = '+11.4%';
  const marginGrowth    = '+8.2%';

  return (
    <div className="rpt-page">

      {/* Header */}
      <div className="rpt-header">
        <div>
          <h2 className="rpt-title">Reports & Analytics</h2>
          <p className="rpt-sub">Financial overview and performance metrics</p>
        </div>
        <div className="rpt-period-tabs">
          {periods.map(p => (
            <button
              key={p}
              className={`rpt-period-tab ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}
            >{p}</button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="rpt-kpi-grid">
        <div className="rpt-kpi-card rpt-kpi-primary">
          <div className="rpt-kpi-label">Revenue</div>
          <div className="rpt-kpi-val">${currentRevenue.toLocaleString()}</div>
          <div className="rpt-kpi-delta rpt-pos">{revenueGrowth} vs last month</div>
        </div>
        <div className="rpt-kpi-card">
          <div className="rpt-kpi-label">Cost of goods</div>
          <div className="rpt-kpi-val">${currentCOGS.toLocaleString()}</div>
          <div className="rpt-kpi-delta rpt-neg">+9.1% vs last month</div>
        </div>
        <div className="rpt-kpi-card rpt-kpi-green">
          <div className="rpt-kpi-label">Gross profit</div>
          <div className="rpt-kpi-val">${currentMargin.toLocaleString()}</div>
          <div className="rpt-kpi-delta rpt-pos">{marginGrowth} vs last month</div>
        </div>
        <div className="rpt-kpi-card">
          <div className="rpt-kpi-label">Gross margin</div>
          <div className="rpt-kpi-val">{marginPct}%</div>
          <div className="rpt-kpi-delta rpt-neutral">Target: 30%</div>
        </div>
      </div>

      {/* Charts row */}
      <div className="rpt-charts-row">

        {/* Revenue chart */}
        <div className="rpt-panel rpt-panel-lg">
          <div className="rpt-panel-header">
            <div className="rpt-panel-title">Revenue vs Cost of goods</div>
            <div className="rpt-panel-legend">
              <span className="rpt-legend-dot" style={{background:'#059669'}} />
              <span className="rpt-legend-label">Revenue</span>
              <span className="rpt-legend-dot" style={{background:'#E5E7EB'}} />
              <span className="rpt-legend-label">COGS</span>
            </div>
          </div>
          <div className="rpt-dual-bar-chart">
            {MONTHLY_REVENUE.map((d, i) => {
              const maxVal = 700000;
              const revH = (d.value / maxVal) * 100;
              const cogH = (MONTHLY_COGS[i].value / maxVal) * 100;
              return (
                <div key={d.label} className="rpt-dual-col">
                  <div className="rpt-dual-bars">
                    <div className="rpt-dual-bar rpt-rev-bar" style={{ height: `${revH}%` }} />
                    <div className="rpt-dual-bar rpt-cog-bar" style={{ height: `${cogH}%` }} />
                  </div>
                  <span className="rpt-bar-label">{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stock value trend */}
        <div className="rpt-panel rpt-panel-sm">
          <div className="rpt-panel-header">
            <div className="rpt-panel-title">Stock value trend</div>
          </div>
          <LineChart data={STOCK_VALUE_TREND} color="#2563EB" height={240} />
          <div className="rpt-trend-footer">
            <span className="rpt-trend-val">$2,840,000</span>
            <span className="rpt-trend-delta rpt-pos">↑ 6.2% this month</span>
          </div>
        </div>

      </div>

      {/* Bottom row */}
      <div className="rpt-bottom-row">

        {/* Top products */}
        <div className="rpt-panel">
          <div className="rpt-panel-header">
            <div className="rpt-panel-title">Top products by revenue</div>
            <button className="rpt-export-btn">↓ Export</button>
          </div>
          <div className="rpt-top-table-head">
            <span>Product</span>
            <span>Revenue</span>
            <span>Units</span>
            <span>Margin</span>
            <span>Share</span>
          </div>
          {TOP_PRODUCTS.map((p, i) => {
            const maxRev = TOP_PRODUCTS[0].revenue;
            const share  = ((p.revenue / MONTHLY_REVENUE[5].value) * 100).toFixed(1);
            return (
              <div className="rpt-top-row" key={p.name}>
                <div className="rpt-top-name-cell">
                  <span className="rpt-rank">#{i+1}</span>
                  <span className="rpt-top-name">{p.name}</span>
                </div>
                <span className="rpt-top-rev">${p.revenue.toLocaleString()}</span>
                <span className="rpt-top-units">{p.units}</span>
                <span className={`rpt-top-margin ${p.margin >= 30 ? 'rpt-margin-good' : 'rpt-margin-ok'}`}>
                  {p.margin}%
                </span>
                <div className="rpt-share-cell">
                  <div className="rpt-share-bar">
                    <div
                      className="rpt-share-fill"
                      style={{ width: `${(p.revenue / maxRev) * 100}%` }}
                    />
                  </div>
                  <span className="rpt-share-pct">{share}%</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Top customers */}
        <div className="rpt-panel">
          <div className="rpt-panel-header">
            <div className="rpt-panel-title">Top customers by spend</div>
            <button className="rpt-export-btn">↓ Export</button>
          </div>
          <div className="rpt-top-table-head">
            <span>Customer</span>
            <span>Lifetime spend</span>
            <span>Orders</span>
            <span>Avg order</span>
          </div>
          {TOP_CUSTOMERS.map((c, i) => {
            const maxSpend = TOP_CUSTOMERS[0].revenue;
            return (
              <div className="rpt-top-row" key={c.name}>
                <div className="rpt-top-name-cell">
                  <span className="rpt-rank">#{i+1}</span>
                  <div className="rpt-top-cust-info">
                    <span className="rpt-top-name">{c.name}</span>
                    <div className="rpt-cust-bar">
                      <div
                        className="rpt-cust-fill"
                        style={{ width: `${(c.revenue / maxSpend) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                <span className="rpt-top-rev">${(c.revenue/1000000).toFixed(1)}M</span>
                <span className="rpt-top-units">{c.orders}</span>
                <span className="rpt-top-avg">${c.avgOrder.toLocaleString()}</span>
              </div>
            );
          })}
        </div>

        {/* Category breakdown */}
        <div className="rpt-panel rpt-panel-narrow">
          <div className="rpt-panel-header">
            <div className="rpt-panel-title">Revenue by category</div>
          </div>
          <DonutChart data={CATEGORY_BREAKDOWN} />
        </div>

      </div>

    </div>
  );
}