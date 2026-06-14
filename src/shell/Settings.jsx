import { useState } from 'react';
import './Settings.css';

// ── Section nav ────────────────────────────────────────────────────
const SECTIONS = [
  { key: 'company',   label: 'Company profile',  icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { key: 'users',     label: 'Users & roles',    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { key: 'billing',   label: 'Billing & plan',   icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  { key: 'invoicing', label: 'Invoice settings', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { key: 'alerts',    label: 'Alerts & notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { key: 'api',       label: 'API & webhooks',   icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
];

const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

// ── Company profile ────────────────────────────────────────────────
function CompanyProfile() {
  return (
    <div className="set-section-body">
      <div className="set-section-title">Company profile</div>
      <div className="set-section-desc">
        This information appears on your invoices and documents.
      </div>

      <div className="set-form-grid">
        <div className="set-field set-field-full">
          <label>Company name</label>
          <input defaultValue="Somchai Trading Co." />
        </div>
        <div className="set-field">
          <label>Tax ID</label>
          <input defaultValue="0105562012345" />
        </div>
        <div className="set-field">
          <label>Phone</label>
          <input defaultValue="+66 2 123 4567" />
        </div>
        <div className="set-field set-field-full">
          <label>Address</label>
          <input defaultValue="123 Sukhumvit Road, Bangkok 10110" />
        </div>
        <div className="set-field">
          <label>Email</label>
          <input type="email" defaultValue="contact@somchaitrading.co.th" />
        </div>
        <div className="set-field">
          <label>Website</label>
          <input defaultValue="www.somchaitrading.co.th" />
        </div>
      </div>

      <div className="set-divider" />
      <div className="set-subsection-title">Bank & payment details</div>
      <div className="set-subsection-desc">Shown on invoices for customer payments.</div>

      <div className="set-form-grid">
        <div className="set-field">
          <label>Bank name</label>
          <input defaultValue="Kasikorn Bank" />
        </div>
        <div className="set-field">
          <label>Account number</label>
          <input defaultValue="123-4-56789-0" />
        </div>
        <div className="set-field">
          <label>Account name</label>
          <input defaultValue="Somchai Trading Co. Ltd." />
        </div>
        <div className="set-field">
          <label>PromptPay ID</label>
          <input defaultValue="0891234567" />
        </div>
      </div>

      <div className="set-actions">
        <button className="set-btn-primary">Save changes</button>
      </div>
    </div>
  );
}

// ── Users & roles ──────────────────────────────────────────────────
const USERS = [
  { id: 1, name: 'Somchai Klahan',  email: 'somchai@somchaitrading.co.th', role: 'Admin',     status: 'active', lastLogin: '2025-06-09' },
  { id: 2, name: 'Wichai Prateep',  email: 'wichai@somchaitrading.co.th',  role: 'Warehouse', status: 'active', lastLogin: '2025-06-09' },
  { id: 3, name: 'Nida Sangwan',    email: 'nida@somchaitrading.co.th',    role: 'Sales',     status: 'active', lastLogin: '2025-06-08' },
  { id: 4, name: 'Prasit Thongtae', email: 'prasit@somchaitrading.co.th',  role: 'Finance',   status: 'inactive',lastLogin: '2025-05-20'},
];

const ROLE_COLORS = {
  Admin:     { bg: '#F5F3FF', color: '#7C3AED' },
  Manager:   { bg: '#EFF6FF', color: '#2563EB' },
  Sales:     { bg: '#ECFDF5', color: '#059669' },
  Warehouse: { bg: '#FFFBEB', color: '#D97706' },
  Finance:   { bg: '#FEF2F2', color: '#DC2626' },
};

function UsersRoles() {
  const [showInvite, setShowInvite] = useState(false);

  return (
    <div className="set-section-body">
      <div className="set-section-header-row">
        <div>
          <div className="set-section-title">Users & roles</div>
          <div className="set-section-desc">Manage who has access and what they can do.</div>
        </div>
        <button className="set-btn-primary" onClick={() => setShowInvite(true)}>
          + Invite user
        </button>
      </div>

      {/* Role reference */}
      <div className="set-roles-grid">
        {Object.entries(ROLE_COLORS).map(([role, colors]) => (
          <div key={role} className="set-role-chip" style={{ background: colors.bg, color: colors.color }}>
            {role}
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="set-users-table">
        <div className="set-users-head">
          <span>Name</span>
          <span>Email</span>
          <span>Role</span>
          <span>Last login</span>
          <span>Status</span>
          <span></span>
        </div>
        {USERS.map(u => {
          const rc = ROLE_COLORS[u.role] || { bg: '#F3F4F6', color: '#6B7280' };
          return (
            <div className="set-user-row" key={u.id}>
              <div className="set-user-name-cell">
                <div className="set-user-avatar">
                  {u.name.split(' ').map(w=>w[0]).join('').slice(0,2)}
                </div>
                <span className="set-user-name">{u.name}</span>
              </div>
              <span className="set-user-email">{u.email}</span>
              <span className="set-role-badge" style={{ background: rc.bg, color: rc.color }}>
                {u.role}
              </span>
              <span className="set-user-login">{u.lastLogin}</span>
              <span className={`set-user-status ${u.status === 'active' ? 'set-status-active' : 'set-status-inactive'}`}>
                {u.status === 'active' ? 'Active' : 'Inactive'}
              </span>
              <div className="set-user-actions">
                <button className="set-user-btn">Edit</button>
                <button className="set-user-btn set-user-btn-danger">Remove</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Permissions table */}
      <div className="set-divider" />
      <div className="set-subsection-title">Role permissions</div>
      <div className="set-permissions-table">
        <div className="set-perm-head">
          <span className="set-perm-feature">Feature</span>
          {Object.keys(ROLE_COLORS).map(r => (
            <span key={r} className="set-perm-role">{r}</span>
          ))}
        </div>
        {[
          { name: 'View dashboard',     perms: [true,  true,  true,  true,  true ] },
          { name: 'Manage products',    perms: [true,  true,  false, true,  false] },
          { name: 'Create orders',      perms: [true,  true,  true,  false, false] },
          { name: 'Create invoices',    perms: [true,  true,  true,  false, true ] },
          { name: 'View reports',       perms: [true,  true,  false, false, true ] },
          { name: 'Manage users',       perms: [true,  false, false, false, false] },
          { name: 'API & webhooks',     perms: [true,  false, false, false, false] },
          { name: 'Billing settings',   perms: [true,  false, false, false, false] },
        ].map(row => (
          <div key={row.name} className="set-perm-row">
            <span className="set-perm-feature">{row.name}</span>
            {row.perms.map((has, i) => (
              <span key={i} className="set-perm-role">
                {has
                  ? <span className="set-perm-yes">✓</span>
                  : <span className="set-perm-no">—</span>
                }
              </span>
            ))}
          </div>
        ))}
      </div>

      {showInvite && (
        <div className="set-modal-overlay" onClick={() => setShowInvite(false)}>
          <div className="set-modal" onClick={e => e.stopPropagation()}>
            <div className="set-modal-header">
              <h3>Invite user</h3>
              <button className="set-modal-close" onClick={() => setShowInvite(false)}>✕</button>
            </div>
            <div className="set-modal-body">
              <div className="set-form-grid">
                <div className="set-field">
                  <label>Full name</label>
                  <input placeholder="e.g. Malee Srisuk" />
                </div>
                <div className="set-field">
                  <label>Email address</label>
                  <input type="email" placeholder="malee@company.com" />
                </div>
                <div className="set-field set-field-full">
                  <label>Role</label>
                  <select>
                    <option>Admin</option>
                    <option>Manager</option>
                    <option>Sales</option>
                    <option>Warehouse</option>
                    <option>Finance</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="set-modal-footer">
              <button className="set-btn-outline" onClick={() => setShowInvite(false)}>Cancel</button>
              <button className="set-btn-primary">Send invitation</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Billing & plan ─────────────────────────────────────────────────
function BillingPlan() {
  return (
    <div className="set-section-body">
      <div className="set-section-title">Billing & plan</div>
      <div className="set-section-desc">Manage your Invmatics Systems subscription.</div>

      <div className="set-plan-card">
        <div className="set-plan-badge">Current plan</div>
        <div className="set-plan-name">Growth</div>
        <div className="set-plan-price">$69<span>/month</span></div>
        <div className="set-plan-features">
          <div className="set-plan-feat"><span className="set-feat-check">✓</span>10 staff accounts (8 used)</div>
          <div className="set-plan-feat"><span className="set-feat-check">✓</span>Unlimited products</div>
          <div className="set-plan-feat"><span className="set-feat-check">✓</span>Full reporting & margin tracking</div>
          <div className="set-plan-feat"><span className="set-feat-check">✓</span>Email invoice delivery</div>
          <div className="set-plan-feat"><span className="set-feat-check">✓</span>LINE notifications</div>
          <div className="set-plan-feat"><span className="set-feat-check">✓</span>1 webhook endpoint</div>
        </div>
        <div className="set-plan-actions">
          <button className="set-btn-outline">Upgrade to Business</button>
          <button className="set-btn-danger">Cancel plan</button>
        </div>
      </div>

      <div className="set-divider" />
      <div className="set-subsection-title">Billing history</div>

      <div className="set-billing-table">
        <div className="set-billing-head">
          <span>Date</span>
          <span>Description</span>
          <span>Amount</span>
          <span>Status</span>
          <span></span>
        </div>
        {[
          { date: '2025-06-01', desc: 'Growth plan — June 2025', amount: '$69.00', status: 'paid' },
          { date: '2025-05-01', desc: 'Growth plan — May 2025',  amount: '$69.00', status: 'paid' },
          { date: '2025-04-01', desc: 'Growth plan — April 2025',amount: '$69.00', status: 'paid' },
        ].map((b, i) => (
          <div className="set-billing-row" key={i}>
            <span className="set-billing-date">{b.date}</span>
            <span className="set-billing-desc">{b.desc}</span>
            <span className="set-billing-amount">{b.amount}</span>
            <span className="set-billing-status">{b.status}</span>
            <button className="set-download-btn">↓ PDF</button>
          </div>
        ))}
      </div>
    </div>
  );
}

const ADD_INPUT_STYLE = {
  padding: '7px 10px', border: '1px solid #E5E7EB', borderRadius: 6,
  fontSize: 13, fontFamily: 'inherit', color: '#111827',
  background: '#fff', outline: 'none', flex: 1, minWidth: 0,
};

// ── Invoice settings ───────────────────────────────────────────────
function InvoiceSettings() {
  const DEFAULT_TERMS = ['Due on receipt', 'Net 14', 'Net 30', 'Net 60'];
  const [paymentTerms, setPaymentTerms] = useState(DEFAULT_TERMS);
  const [formTerm,     setFormTerm]     = useState('Net 14');
  const [newTermMode,  setNewTermMode]  = useState(false);
  const [newTermInput, setNewTermInput] = useState('');

  function addTerm() {
    const t = newTermInput.trim();
    if (!t) return;
    setPaymentTerms(prev => [...prev, t]);
    setFormTerm(t);
    setNewTermMode(false);
    setNewTermInput('');
  }

  return (
    <div className="set-section-body">
      <div className="set-section-title">Invoice settings</div>
      <div className="set-section-desc">Configure how your invoices are generated and numbered.</div>

      <div className="set-form-grid">
        <div className="set-field">
          <label>Invoice prefix</label>
          <input defaultValue="INV" />
        </div>
        <div className="set-field">
          <label>Next invoice number</label>
          <input type="number" defaultValue="00042" />
        </div>
        <div className="set-field">
          <label>Default payment terms</label>
          {newTermMode ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                style={ADD_INPUT_STYLE}
                placeholder="e.g. Net 45"
                value={newTermInput}
                autoFocus
                onChange={e => setNewTermInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addTerm(); if (e.key === 'Escape') { setNewTermMode(false); setNewTermInput(''); } }}
              />
              <button className="set-btn-primary" style={{ padding: '7px 12px', fontSize: 12 }} onClick={addTerm}>Add</button>
              <button className="set-btn-outline" style={{ padding: '7px 12px', fontSize: 12 }} onClick={() => { setNewTermMode(false); setNewTermInput(''); }}>Cancel</button>
            </div>
          ) : (
            <select value={formTerm} onChange={e => { if (e.target.value === '__add_new_term__') setNewTermMode(true); else setFormTerm(e.target.value); }}>
              {paymentTerms.map(t => <option key={t} value={t}>{t}</option>)}
              <option value="__add_new_term__">+ Add payment term…</option>
            </select>
          )}
        </div>
        <div className="set-field">
          <label>VAT rate (%)</label>
          <input type="number" defaultValue="7" />
        </div>
        <div className="set-field set-field-full">
          <label>Default invoice notes</label>
          <textarea className="set-textarea" rows={3}
            defaultValue="Payment via bank transfer or PromptPay. Thank you for your business." />
        </div>
      </div>

      <div className="set-divider" />
      <div className="set-subsection-title">Email delivery</div>
      <div className="set-subsection-desc">Configure automatic invoice emails.</div>

      <div className="set-toggle-list">
        {[
          { label: 'Send invoice automatically on order completion', on: true  },
          { label: 'Send payment reminder 3 days before due date',   on: true  },
          { label: 'Send overdue notice after due date',             on: false },
        ].map((t, i) => (
          <div className="set-toggle-row" key={i}>
            <span className="set-toggle-label">{t.label}</span>
            <button className={`set-toggle ${t.on ? 'set-toggle-on' : ''}`}>
              <span className="set-toggle-thumb" />
            </button>
          </div>
        ))}
      </div>

      <div className="set-actions">
        <button className="set-btn-primary">Save changes</button>
      </div>
    </div>
  );
}

// ── Alerts ─────────────────────────────────────────────────────────
function Alerts() {
  return (
    <div className="set-section-body">
      <div className="set-section-title">Alerts & notifications</div>
      <div className="set-section-desc">Choose what you get notified about and how.</div>

      {[
        {
          group: 'Stock alerts',
          items: [
            { label: 'Low stock alert',           sub: 'When a product falls below its reorder point', on: true  },
            { label: 'Out of stock alert',         sub: 'When a product reaches zero',                  on: true  },
            { label: 'Stock received confirmation',sub: 'When a purchase order is marked received',      on: false },
          ]
        },
        {
          group: 'Order alerts',
          items: [
            { label: 'New order placed',           sub: 'When a sales order is created',                on: true  },
            { label: 'Order overdue',              sub: 'When a delivery date passes without fulfilment',on: true  },
          ]
        },
        {
          group: 'Payment alerts',
          items: [
            { label: 'Invoice payment received',   sub: 'When an invoice is marked as paid',            on: true  },
            { label: 'Payment overdue',            sub: 'When a customer payment is past due date',      on: true  },
          ]
        },
      ].map(group => (
        <div key={group.group} className="set-alert-group">
          <div className="set-alert-group-title">{group.group}</div>
          {group.items.map((item, i) => (
            <div className="set-alert-row" key={i}>
              <div className="set-alert-info">
                <span className="set-alert-label">{item.label}</span>
                <span className="set-alert-sub">{item.sub}</span>
              </div>
              <div className="set-alert-channels">
                <button className={`set-toggle ${item.on ? 'set-toggle-on' : ''}`}>
                  <span className="set-toggle-thumb" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}

      <div className="set-actions">
        <button className="set-btn-primary">Save preferences</button>
      </div>
    </div>
  );
}

// ── API & Webhooks ─────────────────────────────────────────────────
const API_KEYS = [
  { name: 'Production key',  key: 'inv_live_sk_••••••••••••••••3f2a', created: '2025-05-01', lastUsed: '2025-06-09', active: true  },
  { name: 'Staging key',     key: 'inv_test_sk_••••••••••••••••8b1c', created: '2025-05-01', lastUsed: '2025-06-05', active: true  },
];

function ApiWebhooks() {
  return (
    <div className="set-section-body">
      <div className="set-section-title">API & webhooks</div>
      <div className="set-section-desc">
        Integrate Invmatics with your other systems.
        Available on Growth and Business plans.
      </div>

      {/* API keys */}
      <div className="set-subsection-title">API keys</div>
      <div className="set-api-table">
        {API_KEYS.map((k, i) => (
          <div className="set-api-row" key={i}>
            <div className="set-api-info">
              <span className="set-api-name">{k.name}</span>
              <span className="set-api-key">{k.key}</span>
            </div>
            <div className="set-api-meta">
              <span className="set-api-meta-item">Created {k.created}</span>
              <span className="set-api-meta-item">Last used {k.lastUsed}</span>
            </div>
            <div className="set-api-actions">
              <button className="set-user-btn">Reveal</button>
              <button className="set-user-btn">Rotate</button>
              <button className="set-user-btn set-user-btn-danger">Revoke</button>
            </div>
          </div>
        ))}
        <button className="set-add-key-btn">+ Generate new API key</button>
      </div>

      <div className="set-divider" />

      {/* Webhooks */}
      <div className="set-subsection-header">
        <div className="set-subsection-title">Webhook endpoints</div>
        <button className="set-btn-sm">+ Add endpoint</button>
      </div>

      <div className="set-webhook-table">
        <div className="set-webhook-row">
          <div className="set-webhook-info">
            <span className="set-webhook-url">https://api.yourplatform.com/invmatics/stock</span>
            <div className="set-webhook-events">
              <span className="set-event-tag">stock.low</span>
              <span className="set-event-tag">stock.out</span>
              <span className="set-event-tag">stock.updated</span>
            </div>
          </div>
          <span className="set-webhook-status set-wh-active">Active</span>
          <div className="set-api-actions">
            <button className="set-user-btn">Edit</button>
            <button className="set-user-btn">Test</button>
            <button className="set-user-btn set-user-btn-danger">Delete</button>
          </div>
        </div>
      </div>

      <div className="set-divider" />

      {/* Event list */}
      <div className="set-subsection-title">Available webhook events</div>
      <div className="set-events-grid">
        {[
          'stock.low', 'stock.out', 'stock.updated',
          'order.created', 'order.status_changed', 'order.fulfilled',
          'invoice.created', 'invoice.paid', 'payment.overdue',
          'purchase.created', 'purchase.received',
        ].map(e => (
          <span key={e} className="set-event-tag">{e}</span>
        ))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────
export default function Settings() {
  const [active, setActive] = useState('company');

  const panels = {
    company:   <CompanyProfile />,
    users:     <UsersRoles />,
    billing:   <BillingPlan />,
    invoicing: <InvoiceSettings />,
    alerts:    <Alerts />,
    api:       <ApiWebhooks />,
  };

  return (
    <div className="set-page">
      <div className="set-sidebar">
        {SECTIONS.map(s => (
          <button
            key={s.key}
            className={`set-nav-item ${active === s.key ? 'active' : ''}`}
            onClick={() => setActive(s.key)}
          >
            <Icon d={s.icon} size={16} />
            {s.label}
          </button>
        ))}
      </div>
      <div className="set-content">
        {panels[active]}
      </div>
    </div>
  );
}