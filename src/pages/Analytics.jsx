/**
 * pages/Analytics.jsx — Reports and analytics
 * Real data from /api/analytics/*
 */

import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../lib/api';
import { fmt, baseCurrency } from '../lib/money';
import { downloadCsv, stamp } from '../lib/exportCsv';

const PERIODS = [
  { key: 'this_month',    label: 'This month'    },
  { key: 'last_month',    label: 'Last month'    },
  { key: 'last_3_months', label: 'Last 3 months' },
  { key: 'this_year',     label: 'This year'     },
];

const REPORTS = [
  { key: 'revenue',    label: 'Revenue trend'     },
  { key: 'products',   label: 'Top products'      },
  { key: 'customers',  label: 'Top customers'     },
  { key: 'categories', label: 'Revenue by category'},
];

export default function Analytics() {
  const api = useApi();

  const [period,     setPeriod]     = useState('this_month');
  const [report,     setReport]     = useState('revenue');
  const [data,       setData]       = useState(null);
  const [summary,    setSummary]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sum, reportData] = await Promise.all([
        api.get(`/analytics/summary?period=${period}`),
        report === 'revenue'
          ? api.get(`/analytics/revenue-trend?period=${period}`)
          : report === 'products'
          ? api.get(`/analytics/top-products?period=${period}`)
          : report === 'customers'
          ? api.get(`/analytics/top-customers?period=${period}`)
          : api.get(`/analytics/revenue-by-category?period=${period}`),
      ]);
      setSummary(sum);
      setData(reportData);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [api, period, report]);

  useEffect(() => { load(); }, [load]);

  const exportSheet = () => {
    const pl = PERIODS.find(p => p.key === period)?.label || period;
    const rl = REPORTS.find(r => r.key === report)?.label || report;
    const out = [[`Invmatics report`, pl, `Amounts in ${baseCurrency()}`], []];
    if (summary) {
      out.push(['Summary'],
        ['Revenue', summary.revenue], ['Gross profit', summary.gross_profit],
        ['Gross margin %', summary.gross_margin],
        ['Outstanding receivables', summary.outstanding_receivables],
        ['Overdue invoices', summary.overdue_count], ['Stock value', summary.stock_value], []);
    }
    out.push([rl]);
    if (report === 'revenue' && data?.trend) {
      out.push(['Month', 'Revenue', 'COGS', 'Gross profit', 'Margin %']);
      data.trend.forEach(r => out.push([`${r.label} ${r.year}`, r.revenue, r.cogs, r.gross_profit, r.gross_margin]));
    } else if (report === 'products' && data?.products) {
      out.push(['Product', 'SKU', 'Units sold', 'Revenue', 'Margin %', 'Share %']);
      data.products.forEach(r => out.push([r.name, r.sku, r.units_sold, r.revenue, r.margin_pct, r.revenue_share]));
    } else if (report === 'customers' && data?.customers) {
      out.push(['Customer', 'Orders', 'Total spend', 'Avg order value']);
      data.customers.forEach(r => out.push([r.name, r.order_count, r.total_spend, r.avg_order_value]));
    } else if (report === 'categories' && data?.categories) {
      out.push(['Category', 'Revenue', 'Share %']);
      data.categories.forEach(r => out.push([r.category, r.revenue, r.share_pct]));
    }
    downloadCsv(`report-${report}-${period}-${stamp()}`, out);
  };

  const renderTable = () => {
    if (loading) return (
      <div style={{ padding: 24 }}>
        {Array(5).fill(0).map((_, i) => (
          <div key={i} className="im-skeleton" style={{ height: 13, width: `${70 + Math.random() * 20}%`, marginBottom: 12 }} />
        ))}
      </div>
    );

    if (!data) return null;

    if (report === 'revenue' && data.trend) {
      return (
        <table className="im-table">
          <thead><tr><th>Month</th><th className="num">Revenue</th><th className="num">COGS</th><th className="num">Gross profit</th><th className="num">Margin</th></tr></thead>
          <tbody>
            {data.trend.map(row => (
              <tr key={`${row.year}-${row.month}`}>
                <td>{row.label} {row.year}</td>
                <td className="num">{fmt(row.revenue)}</td>
                <td className="num">{fmt(row.cogs)}</td>
                <td className="num" style={{ color: 'var(--green)', fontWeight: 700 }}>{fmt(row.gross_profit)}</td>
                <td className="num">{row.gross_margin}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (report === 'products' && data.products) {
      return (
        <table className="im-table">
          <thead><tr><th>Product</th><th>SKU</th><th className="num">Units sold</th><th className="num">Revenue</th><th className="num">Margin</th><th className="num">Share</th></tr></thead>
          <tbody>
            {data.products.map((row, i) => (
              <tr key={row.product_id}>
                <td><div className="im-td-primary">{i + 1}. {row.name}</div></td>
                <td><span className="im-mono">{row.sku}</span></td>
                <td className="num">{row.units_sold}</td>
                <td className="num">{fmt(row.revenue)}</td>
                <td className="num">{row.margin_pct}%</td>
                <td className="num">{row.revenue_share}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (report === 'customers' && data.customers) {
      return (
        <table className="im-table">
          <thead><tr><th>Customer</th><th className="num">Orders</th><th className="num">Total spend</th><th className="num">Avg order value</th></tr></thead>
          <tbody>
            {data.customers.map((row, i) => (
              <tr key={row.customer_id}>
                <td><div className="im-td-primary">{i + 1}. {row.name}</div></td>
                <td className="num">{row.order_count}</td>
                <td className="num" style={{ fontWeight: 700 }}>{fmt(row.total_spend)}</td>
                <td className="num">{fmt(row.avg_order_value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (report === 'categories' && data.categories) {
      return (
        <table className="im-table">
          <thead><tr><th>Category</th><th className="num">Revenue</th><th className="num">Share</th></tr></thead>
          <tbody>
            {data.categories.map(row => (
              <tr key={row.category}>
                <td>{row.category}</td>
                <td className="num">{fmt(row.revenue)}</td>
                <td className="num">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                    <div style={{ width: 80, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${row.share_pct}%`, height: '100%', background: 'var(--green)', borderRadius: 3 }} />
                    </div>
                    {row.share_pct}%
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    return <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>No data for this period</div>;
  };

  return (
    <div className="im-page">
      <div className="im-page-header">
        <div>
          <h1 className="im-page-title">Analytics</h1>
          <p className="im-page-sub">Business performance reports</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="im-btn-ghost" onClick={exportSheet} disabled={loading || !summary}>
          Download spreadsheet
        </button>
        <div className="im-panel-tabs">
          {PERIODS.map(p => (
            <button key={p.key} className={`im-tab ${period === p.key ? 'active' : ''}`}
              onClick={() => setPeriod(p.key)}>
              {p.label}
            </button>
          ))}
        </div>
        </div>
      </div>

      {error && <div className="im-error">{error}</div>}

      {/* KPI cards */}
      {summary && (
        <div className="im-stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[
            { label: 'Revenue',        value: fmt(summary.revenue),        note: `${summary.gross_margin}% margin` },
            { label: 'Gross profit',   value: fmt(summary.gross_profit),   note: `${summary.gross_margin}%` },
            { label: 'Outstanding',    value: fmt(summary.outstanding_receivables), note: `${summary.overdue_count} overdue` },
            { label: 'Stock value',    value: fmt(summary.stock_value),    note: 'current' },
          ].map(card => (
            <div key={card.label} className="im-stat-card">
              <div className="im-stat-label">{card.label}</div>
              <div className="im-stat-value" style={{ fontSize: 20, marginTop: 6 }}>{card.value}</div>
              <div className="im-stat-delta neutral">{card.note}</div>
            </div>
          ))}
        </div>
      )}

      {/* Report selector + table */}
      <div className="im-panel">
        <div className="im-panel-header">
          <div className="im-panel-tabs">
            {REPORTS.map(r => (
              <button key={r.key} className={`im-tab ${report === r.key ? 'active' : ''}`}
                onClick={() => setReport(r.key)}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="im-table-wrap">
          {renderTable()}
        </div>
      </div>
    </div>
  );
}