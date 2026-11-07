/**
 * pages/Settings.jsx — Company profile, bank & payments, invoice defaults, alerts
 * Real data from /api/settings. Everyone can view; only admins can save.
 */

import { useState, useEffect } from 'react';
import { useApi } from '../lib/api';

const SECTIONS = [
  { key: 'company',       label: 'Company profile' },
  { key: 'bank',          label: 'Bank & payments' },
  { key: 'invoicing',     label: 'Invoice defaults' },
  { key: 'notifications', label: 'Alerts' },
];

const COUNTRIES = [
  ['TH', 'Thailand'], ['SG', 'Singapore'], ['MY', 'Malaysia'], ['ID', 'Indonesia'],
  ['VN', 'Vietnam'], ['PH', 'Philippines'], ['MM', 'Myanmar'], ['KH', 'Cambodia'],
  ['LA', 'Laos'], ['NZ', 'New Zealand'], ['AU', 'Australia'], ['US', 'United States'],
];
const CURRENCIES = ['THB', 'USD', 'SGD', 'MYR', 'IDR', 'VND', 'PHP', 'MMK', 'KHR', 'NZD', 'AUD'];
const TIMEZONES = [
  'Asia/Bangkok', 'Asia/Singapore', 'Asia/Kuala_Lumpur', 'Asia/Jakarta', 'Asia/Ho_Chi_Minh',
  'Asia/Manila', 'Asia/Yangon', 'Pacific/Auckland', 'Australia/Sydney', 'UTC',
];

const ALERTS = [
  ['notify_low_stock',        'Low stock',          'When a product falls to or below its reorder point'],
  ['notify_out_of_stock',     'Out of stock',       'When a product hits zero'],
  ['notify_new_order',        'New orders',         'When a sales order is created'],
  ['notify_overdue',          'Overdue invoices',   'When an invoice passes its due date unpaid'],
  ['notify_payment_received', 'Payments received',  'When a payment is recorded against an invoice'],
];

const ORG_COMPANY = ['name', 'tax_id', 'phone', 'email', 'website', 'address', 'country', 'currency', 'timezone'];
const ORG_BANK    = ['bank_name', 'bank_account_name', 'bank_account_no', 'promptpay_id'];

const pick = (obj, keys) => Object.fromEntries(keys.map(k => [k, obj?.[k] ?? '']));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function withCurrent(options, current) {
  return current && !options.includes(current) ? [current, ...options] : options;
}

export default function Settings() {
  const api = useApi();

  const [data,    setData]    = useState(null);      // last saved values from the server
  const [draft,   setDraft]   = useState(null);      // what the form currently shows
  const [section, setSection] = useState('company');
  const [error,   setError]   = useState(null);
  const [notice,  setNotice]  = useState(null);
  const [saving,  setSaving]  = useState(false);

  const fromServer = (d) => ({
    company:       pick(d.organisation, ORG_COMPANY),
    bank:          pick(d.organisation, ORG_BANK),
    invoicing: {
      default_payment_terms: String(d.invoicing.default_payment_terms ?? ''),
      default_tax_rate:      String(d.invoicing.default_tax_rate ?? ''),
      default_invoice_notes: d.invoicing.default_invoice_notes ?? '',
    },
    notifications: { ...d.notifications },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await api.get('/settings');
        if (cancelled) return;
        const f = fromServer(d);
        setData({ ...d, form: f });
        setDraft(f);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [api]);

  const canEdit = data?.can_edit;
  const dirty = data && draft && !same(draft[section], data.form[section]);

  const set = (key, value) => {
    setNotice(null);
    setDraft(d => ({ ...d, [section]: { ...d[section], [key]: value } }));
  };

  const save = async () => {
    setSaving(true); setError(null); setNotice(null);
    try {
      const v = draft[section];
      if (section === 'company' || section === 'bank') {
        await api.put('/settings/organisation', v);
      } else if (section === 'invoicing') {
        await api.put('/settings/invoicing', {
          default_payment_terms: parseInt(v.default_payment_terms, 10),
          default_tax_rate:      parseFloat(v.default_tax_rate),
          default_invoice_notes: v.default_invoice_notes,
        });
      } else {
        await api.put('/settings/notifications', v);
      }
      // reload so the form shows exactly what was stored (trimmed, upper-cased, defaults)
      const d = await api.get('/settings');
      const f = fromServer(d);
      setData({ ...d, form: f });
      setDraft(f);
      setNotice('Saved');
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const reset = () => { setNotice(null); setDraft(d => ({ ...d, [section]: data.form[section] })); };

  const text = (key, label, props = {}, span2 = false) => (
    <div className={`im-field ${span2 ? 'span-2' : ''}`} key={key}>
      <label>{label}</label>
      <input value={draft[section][key]} disabled={!canEdit}
        onChange={e => set(key, e.target.value)} {...props} />
    </div>
  );

  const select = (key, label, options) => (
    <div className="im-field" key={key}>
      <label>{label}</label>
      <select value={draft[section][key]} disabled={!canEdit} onChange={e => set(key, e.target.value)}>
        {options.map(o => Array.isArray(o)
          ? <option key={o[0]} value={o[0]}>{o[1]}</option>
          : <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div className="im-page">
      <div className="im-page-header">
        <div>
          <h1 className="im-page-title">Settings</h1>
          <p className="im-page-sub">Your company details appear on invoices, quotations and delivery documents</p>
        </div>
      </div>

      {error  && <div className="im-error" onClick={() => setError(null)}>{error} ✕</div>}

      <div className="im-tabs">
        {SECTIONS.map(s => (
          <button key={s.key} className={`im-tab ${section === s.key ? 'active' : ''}`}
            onClick={() => { setSection(s.key); setNotice(null); }}>
            {s.label}
          </button>
        ))}
      </div>

      {!draft ? (
        <div className="im-panel" style={{ padding: 24 }}>
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="im-skeleton" style={{ height: 14, width: `${50 + i * 10}%`, marginBottom: 14 }} />
          ))}
        </div>
      ) : (
        <div className="im-panel" style={{ padding: 24, maxWidth: 760 }}>
          {!canEdit && (
            <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-muted)' }}>
              Only admins can change settings. You're viewing them read-only.
            </div>
          )}

          {section === 'company' && (
            <div className="im-form-grid">
              {text('name', 'Company name *', {}, true)}
              {text('tax_id', 'Tax ID')}
              {text('phone', 'Phone')}
              {text('email', 'Email', { type: 'email' })}
              {text('website', 'Website')}
              {text('address', 'Address', {}, true)}
              {select('country', 'Country', withCurrent(COUNTRIES.map(c => c[0]), draft.company.country).map(
                code => COUNTRIES.find(c => c[0] === code) || [code, code]))}
              {select('currency', 'Currency', withCurrent(CURRENCIES, draft.company.currency))}
              {select('timezone', 'Timezone', withCurrent(TIMEZONES, draft.company.timezone))}
            </div>
          )}

          {section === 'bank' && (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 0 }}>
                Printed on invoices so customers know where to pay.
              </p>
              <div className="im-form-grid">
                {text('bank_name', 'Bank name')}
                {text('bank_account_name', 'Account name')}
                {text('bank_account_no', 'Account number')}
                {text('promptpay_id', 'PromptPay ID (phone or tax ID)')}
              </div>
            </>
          )}

          {section === 'invoicing' && (
            <div className="im-form-grid">
              {text('default_payment_terms', 'Payment terms (days)', { type: 'number', min: 0, max: 365 })}
              {text('default_tax_rate', 'Default tax / VAT rate (%)', { type: 'number', min: 0, max: 100, step: '0.01' })}
              {text('default_invoice_notes', 'Default invoice notes', {}, true)}
            </div>
          )}

          {section === 'notifications' && (
            <div>
              {ALERTS.map(([key, label, desc]) => (
                <label key={key} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0',
                  borderBottom: '1px solid var(--border-light, var(--border))', cursor: canEdit ? 'pointer' : 'default' }}>
                  <input type="checkbox" style={{ marginTop: 3 }} disabled={!canEdit}
                    checked={!!draft.notifications[key]} onChange={e => set(key, e.target.checked)} />
                  <span>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{label}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)' }}>{desc}</span>
                  </span>
                </label>
              ))}
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 0 }}>
                These preferences are saved now; email and in-app delivery of alerts is coming.
              </p>
            </div>
          )}

          {canEdit && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 20 }}>
              <button className="im-btn-primary" onClick={save}
                disabled={saving || !dirty || (section === 'company' && !draft.company.name.trim())}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              {dirty && <button className="im-btn-ghost" onClick={reset} disabled={saving}>Discard</button>}
              {notice && !dirty && <span style={{ color: 'var(--green)', fontSize: 13, fontWeight: 600 }}>✓ {notice}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
