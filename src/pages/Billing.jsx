/**
 * pages/Billing.jsx — plan, trial status, usage, and Stripe checkout / portal (admins).
 * Prices here must match the Stripe prices the backend is configured with.
 */
import { useEffect, useState } from 'react';
import { useApi } from '../lib/api';

const PLANS = [
  { key: 'starter',  name: 'Starter',  monthly: 15, blurb: '3 staff, 500 products, invoicing, orders and stock control.' },
  { key: 'growth',   name: 'Growth',   monthly: 39, blurb: '10 staff, unlimited products, reports, delivery, all five roles.', featured: true },
  { key: 'business', name: 'Business', monthly: 99, blurb: 'Unlimited staff and priority support.' },
];
const ORDER = { starter: 0, growth: 1, business: 2 };
const usd = (n) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
const day = (s) => (s ? new Date(s).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—');

export default function Billing() {
  const api = useApi();
  const [b, setB] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [annual, setAnnual] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await api.get('/billing');
        if (!cancelled) { setB(d); setError(null); }
      } catch (e) { if (!cancelled) setError(e.message); }
    })();
    return () => { cancelled = true; };
  }, [api, tick]);

  // After returning from Stripe the webhook may land a moment later: check again a few times.
  useEffect(() => {
    if (!/billing=success/.test(window.location.search)) return;
    const ids = [2000, 5000, 10000].map(ms => setTimeout(() => setTick(t => t + 1), ms));
    return () => ids.forEach(clearTimeout);
  }, []);

  const go = async (path, body, key) => {
    setBusy(key); setError(null);
    try {
      const r = await api.post(path, body);
      window.location.href = r.url;
    } catch (e) { setError(e.message); setBusy(null); }
  };

  const status = !b ? null
    : b.locked ? { tone: 'red', text: b.has_subscription ? 'Subscription ended. Invmatics is read-only.' : 'Trial ended. Invmatics is read-only.' }
    : b.state === 'trial' ? { tone: 'amber', text: b.trial_days_left != null ? `Free trial: ${b.trial_days_left} day${b.trial_days_left === 1 ? '' : 's'} left (Growth features)` : 'Free trial' }
    : b.past_due ? { tone: 'amber', text: 'Payment failed. Update your card to avoid losing access.' }
    : { tone: 'green', text: `${b.plan_label} plan, active` };

  const cap = (n) => (n == null ? 'Unlimited' : n);

  return (
    <div className="im-page">
      <div className="im-page-header">
        <div>
          <h1 className="im-page-title">Billing</h1>
          <p className="im-page-sub">Your plan, usage and payment details.</p>
        </div>
        {b?.has_customer && (
          <button className="im-btn-ghost" disabled={busy === 'portal'} onClick={() => go('/billing/portal', null, 'portal')}>
            Manage billing
          </button>
        )}
      </div>

      {error && <div className="im-error" onClick={() => setError(null)}>{error} ✕</div>}
      {b && !b.payments_ready && (
        <div className="im-error">Online payments aren't switched on yet. Contact us to subscribe.</div>
      )}

      {b && (
        <>
          <div className="im-panel" style={{ padding: 18, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{status.text}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {b.state === 'trial' && b.trial_ends_at && `Trial ends ${day(b.trial_ends_at)}. `}
              {b.has_subscription && b.current_period_end && `${b.locked ? 'Ended' : 'Renews'} ${day(b.current_period_end)}${b.interval ? ` (${b.interval === 'year' ? 'yearly' : 'monthly'})` : ''}. `}
              Staff: {b.usage.staff} / {cap(b.limits.staff)} · Products: {b.usage.products} / {cap(b.limits.products)}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <div className="im-panel-tabs">
              <button className={`im-tab ${!annual ? 'active' : ''}`} onClick={() => setAnnual(false)}>Monthly</button>
              <button className={`im-tab ${annual ? 'active' : ''}`} onClick={() => setAnnual(true)}>Yearly (2 months free)</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            {PLANS.map(p => {
              const interval = annual ? 'yearly' : 'monthly';
              const available = b.available.includes(`${p.key}_${interval}`);
              const current = b.has_subscription && !b.locked && b.plan === p.key;
              const price = annual ? p.monthly * 10 : p.monthly;
              const canBuy = !b.has_subscription || b.locked;
              return (
                <div key={p.key} className="im-panel" style={{ padding: 18, border: p.featured ? '2px solid var(--green)' : undefined }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{p.name}{p.featured ? ' · Most popular' : ''}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, margin: '6px 0 2px' }}>
                    {usd(price)}<span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>/{annual ? 'year' : 'month'}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', minHeight: 54 }}>{p.blurb}</p>
                  {current ? (
                    <button className="im-btn-ghost" disabled>Current plan</button>
                  ) : canBuy ? (
                    <button className="im-btn-primary" disabled={!available || busy === p.key}
                      onClick={() => go('/billing/checkout', { plan: p.key, interval }, p.key)}>
                      {busy === p.key ? 'Opening…' : available ? `Choose ${p.name}` : 'Not available yet'}
                    </button>
                  ) : (
                    <button className="im-btn-ghost" disabled={busy === 'portal'} onClick={() => go('/billing/portal', null, 'portal')}>
                      {ORDER[p.key] > ORDER[b.plan] ? 'Upgrade in billing portal' : 'Change in billing portal'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
