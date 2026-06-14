import './Landing.css'

// ── Icons ──────────────────────────────────────────────────────────
const Icon = ({ path, path2 }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d={path} />
    {path2 && <path d={path2} />}
  </svg>
)

const ICONS = {
  catalog:  'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  stock:    'M12 2L2 7l10 5 10-5-10-5M2 17l10 5 10-5M2 12l10 5 10-5',
  orders:   'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  invoice:  'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  customer: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  supplier: 'M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16',
  dashboard:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  staff:    'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  reports:  'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  check:    'M5 13l4 4L19 7',
  arrow:    'M17 8l4 4m0 0l-4 4m4-4H3',
  play:     'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
}

// ── Feature cards data ─────────────────────────────────────────────
const FEATURES = [
  {
    icon: 'catalog',
    title: 'Product Catalogue',
    desc: 'SKUs, barcodes, variants, custom spec fields, cost vs selling price, gross margin — all in one place.',
  },
  {
    icon: 'stock',
    title: 'Stock Management',
    desc: 'Real-time levels, reorder points, adjustments for receive / damage / theft, and full movement history.',
  },
  {
    icon: 'orders',
    title: 'Sales Orders',
    desc: 'Full order lifecycle from draft to delivered. Partial fulfilment, back orders, and volume pricing tiers.',
  },
  {
    icon: 'invoice',
    title: 'Invoice Generation',
    desc: 'Auto-numbered invoices with configurable tax rates, payment links, bank details, PAID stamp, and instant PDF download.',
  },
  {
    icon: 'customer',
    title: 'Customer Management',
    desc: 'Company directory, credit limits, payment terms, outstanding balance tracking, and per-customer pricing.',
  },
  {
    icon: 'supplier',
    title: 'Supplier Management',
    desc: 'Supplier directory, lead times, purchase order history, price comparison, and one-click reorder.',
  },
  {
    icon: 'dashboard',
    title: 'Dashboard & Financials',
    desc: 'Live stock overview, monthly revenue vs last month, gross margin, top sellers, and outstanding payments.',
  },
  {
    icon: 'staff',
    title: 'Staff & Access Control',
    desc: 'Role-based access for Admin, Manager, Sales, Warehouse, and Finance — with a full activity log.',
  },
  {
    icon: 'reports',
    title: 'Reports & Exports',
    desc: 'Stock, movement, sales, margin, customer, and supplier reports — exportable to Excel and PDF.',
  },
]

// ── Navbar ─────────────────────────────────────────────────────────
function Nav({ onStart }) {
  return (
    <nav className="lp-nav">
      <div className="lp-container">
        <div className="lp-nav-inner">
          <a href="#" className="lp-logo">
            <span className="lp-logo-mark">
              <svg viewBox="0 0 24 24"><path d="M3 12l9-9 9 9M5 10v10h14V10" /></svg>
            </span>
            Invmatics Systems
          </a>
          <ul className="lp-nav-links">
            <li><a href="#features">Features</a></li>
            <li><a href="#highlights">Highlights</a></li>
            <li><a href="#pricing">Pricing</a></li>
          </ul>
          <button className="lp-nav-cta" onClick={onStart}>Get started</button>
        </div>
      </div>
    </nav>
  )
}

// ── Dashboard mockup ───────────────────────────────────────────────
function DashboardMockup() {
  const orders = [
    { ref: 'SO-0041', customer: 'Kasem Construction',  total: '$84,500',  status: 'dispatched', cls: 'mock-info'  },
    { ref: 'SO-0040', customer: 'Phuket Build Ltd.',   total: '$32,100',  status: 'pending',    cls: 'mock-warn'  },
    { ref: 'SO-0039', customer: 'Central Hardware',    total: '$156,200', status: 'delivered',  cls: 'mock-ok'    },
    { ref: 'SO-0038', customer: 'Nonthaburi Works',    total: '$18,750',  status: 'pending',    cls: 'mock-warn'  },
  ]
  const lowStock = [
    { name: 'Cable 2.5mm (100m)', qty: 8,  min: 25, supplier: 'Thai Wire Co.'  },
    { name: 'Steel Conduit 20mm', qty: 3,  min: 20, supplier: 'Bangkok Steel'  },
    { name: 'Drain Cover 300mm',  qty: 12, min: 30, supplier: 'CM Plastics'    },
  ]
  return (
    <div className="lp-mockup">
      <div className="lp-mockup-window">
        {/* Title bar */}
        <div className="lp-mockup-bar">
          <span className="lp-mockup-dot lp-dot-red" />
          <span className="lp-mockup-dot lp-dot-yellow" />
          <span className="lp-mockup-dot lp-dot-green" />
          <span className="lp-mockup-title">Invmatics Systems — Dashboard</span>
        </div>

        <div className="lp-mockup-body">

          {/* Sidebar strip */}
          <div className="lp-mock-sidebar">
            <div className="lp-mock-logo-row">
              <div className="lp-mock-logo-mark" />
              <span className="lp-mock-logo-text">Invmatics</span>
            </div>
            {['Dashboard','Inventory','Orders','Invoices','Customers','Suppliers','Reports'].map((item, i) => (
              <div key={item} className={`lp-mock-nav-item ${i === 0 ? 'active' : ''}`}>{item}</div>
            ))}
          </div>

          {/* Main content */}
          <div className="lp-mock-main">

            {/* Stat cards */}
            <div className="lp-mock-stats">
              {[
                { label: 'Stock Value',    value: '$2,840,000', delta: '↑ 6.2%',   pos: true  },
                { label: 'Revenue (MTD)',  value: '$648,500',   delta: '↑ 11.4%',  pos: true  },
                { label: 'Gross Margin',   value: '$189,200',   delta: '29.2%',     pos: null  },
                { label: 'Pending Orders', value: '14',         delta: '3 overdue', pos: false },
              ].map(c => (
                <div className="lp-mock-stat-card" key={c.label}>
                  <div className="lp-mock-stat-label">{c.label}</div>
                  <div className="lp-mock-stat-val">{c.value}</div>
                  <div className={`lp-mock-stat-delta ${c.pos === true ? 'pos' : c.pos === false ? 'neg' : 'neu'}`}>
                    {c.delta}
                  </div>
                </div>
              ))}
            </div>

            {/* Two panels */}
            <div className="lp-mock-panels">

              {/* Low stock */}
              <div className="lp-mock-panel">
                <div className="lp-mock-panel-head">
                  <span className="lp-mock-panel-dot red" />
                  Low Stock Alerts
                  <span className="lp-mock-panel-link">View all</span>
                </div>
                {lowStock.map(row => (
                  <div className="lp-mock-ls-row" key={row.name}>
                    <div className="lp-mock-ls-info">
                      <div className="lp-mock-ls-name">{row.name}</div>
                      <div className="lp-mock-ls-sup">{row.supplier}</div>
                    </div>
                    <span className="lp-mock-ls-qty red">{row.qty}</span>
                    <span className="lp-mock-ls-sep">/{row.min}</span>
                    <span className="lp-mock-reorder">Reorder →</span>
                  </div>
                ))}
              </div>

              {/* Recent orders */}
              <div className="lp-mock-panel">
                <div className="lp-mock-panel-head">
                  <span className="lp-mock-panel-dot green" />
                  Recent Orders
                  <span className="lp-mock-panel-link">View all</span>
                </div>
                <div className="lp-mock-orders-head">
                  <span>Ref</span><span>Customer</span><span>Total</span><span>Status</span>
                </div>
                {orders.map(o => (
                  <div className="lp-mock-order-row" key={o.ref}>
                    <span className="lp-mock-order-ref">{o.ref}</span>
                    <span className="lp-mock-order-cust">{o.customer}</span>
                    <span className="lp-mock-order-total">{o.total}</span>
                    <span className={`lp-mock-status ${o.cls}`}>{o.status}</span>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Hero ───────────────────────────────────────────────────────────
function Hero({ onStart }) {
  return (
    <section className="lp-hero">
      <div className="lp-container">
        <div className="lp-hero-inner">
          <div>
            <div className="lp-hero-badge">Built for wholesalers &amp; distributors</div>
            <h1>
              Inventory, orders &amp; invoices.<br />
              <span>One system.</span>
            </h1>
            <p className="lp-hero-sub">
              Invmatics Systems gives your team real-time stock visibility, automated
              invoicing with VAT and payment details, and the tools to manage
              customers and suppliers at any scale.
            </p>
            <div className="lp-hero-actions">
              <button className="lp-btn-primary" onClick={onStart}>
                Start for free
                <Icon path={ICONS.arrow} />
              </button>
              <a href="#highlights" className="lp-btn-outline">
                <Icon path={ICONS.play} />
                See how it works
              </a>
            </div>
          </div>
          <DashboardMockup />
        </div>
      </div>
    </section>
  )
}

// ── Stats ──────────────────────────────────────────────────────────
const STATS = [
  { num: '9',    label: 'Integrated modules',    sub: 'Every tool your team needs, built in' },
  { num: '5',    label: 'Staff access roles',     sub: 'Right permissions for every team member' },
  { num: '100%', label: 'Cloud-based',            sub: 'No install, works from any device' },
]

function Stats() {
  return (
    <div className="lp-stats">
      <div className="lp-container">
        <div className="lp-stats-inner">
          {STATS.map((s) => (
            <div className="lp-stat" key={s.label}>
              <div className="lp-stat-num">{s.num}</div>
              <div className="lp-stat-label">{s.label}</div>
              <div className="lp-stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Features ───────────────────────────────────────────────────────
function Features() {
  return (
    <section id="features" className="lp-features">
      <div className="lp-container">
        <div className="lp-section-label">Everything included</div>
        <h2 className="lp-section-title">All the tools your business needs</h2>
        <p className="lp-section-sub">
          Every module works together out of the box — no stitching together
          separate tools or spreadsheets.
        </p>
        <div className="lp-feature-grid">
          {FEATURES.map((f) => (
            <div className="lp-feature-card" key={f.title}>
              <div className="lp-feature-icon">
                <Icon path={ICONS[f.icon]} />
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Highlights ─────────────────────────────────────────────────────
function InvoiceVisual() {
  return (
    <div className="lp-highlight-visual">
      <div className="lp-visual-heading">Invoice #INV-0042</div>
      <div className="lp-invoice-mock">
        <div className="lp-invoice-header">
          <div>
            <div className="lp-invoice-brand">PK Myanmar Trading Co., Ltd.</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, color: 'var(--text)' }}>8 June 2026</div>
            <div style={{ fontSize: 13, color: 'var(--text)' }}>Due: 22 June 2026</div>
          </div>
        </div>
        <div className="lp-invoice-divider" />
        {[
          { desc: 'Steel Pipe 40mm × 50',   amt: '$12,500.00' },
          { desc: 'Copper Wire 2.5mm × 10', amt: '$3,800.00' },
          { desc: 'Discount (5%)',           amt: '−$815.00' },
          { desc: 'Subtotal',                amt: '$15,485.00' },
          { desc: 'Tax (10%)',               amt: '$1,548.50' },
        ].map((l) => (
          <div className="lp-invoice-line" key={l.desc}>
            <span>{l.desc}</span>
            <span>{l.amt}</span>
          </div>
        ))}
        <div className="lp-invoice-total">
          <span>Total</span>
          <span>$17,033.50</span>
        </div>
        <div className="lp-invoice-payment">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          Wire transfer
        </div>
        <div className="lp-paid-stamp">PAID</div>
      </div>
    </div>
  )
}

function StockVisual() {
  const rows = [
    { name: 'PVC Tube 20mm',     qty: '0 / 50',   status: 'out',   action: 'Reorder →' },
    { name: 'Steel Pipe 40mm',   qty: '23 / 100',  status: 'low',   action: 'Reorder →' },
    { name: 'Elbow Joint 1"',    qty: '89 / 200',  status: 'ok',    action: null },
    { name: 'Copper Wire 2.5mm', qty: '156 / 200', status: 'ok',    action: null },
  ]
  return (
    <div className="lp-highlight-visual">
      <div className="lp-visual-heading">Low stock alerts</div>
      <div className="lp-alert-list">
        {rows.map((r) => (
          <div className="lp-alert-row" key={r.name}>
            <span className={`lp-alert-dot ${r.status === 'out' ? 'red' : r.status === 'low' ? 'amber' : 'green'}`} />
            <span className="lp-alert-name">{r.name}</span>
            <span className="lp-alert-qty">{r.qty}</span>
            {r.action && <span className="lp-alert-action">{r.action}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function RoleVisual() {
  const roles = [
    { name: 'Admin',     perms: 'Full access to all modules and settings' },
    { name: 'Manager',   perms: 'All modules except user & system settings' },
    { name: 'Sales',     perms: 'Orders and customer management only' },
    { name: 'Warehouse', perms: 'Inventory and stock adjustments only' },
    { name: 'Finance',   perms: 'Invoices, reports, and financials only' },
  ]
  return (
    <div className="lp-highlight-visual">
      <div className="lp-visual-heading">Role-based access</div>
      <div className="lp-alert-list">
        {roles.map((r) => (
          <div className="lp-alert-row" key={r.name} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
            <span className="lp-alert-name">{r.name}</span>
            <span style={{ fontSize: 13, color: 'var(--text)' }}>{r.perms}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Highlights() {
  return (
    <section id="highlights" className="lp-highlights">
      <div className="lp-container">
        <div className="lp-highlight-list">

          <div className="lp-highlight">
            <div className="lp-highlight-text">
              <div className="lp-section-label">Invoicing</div>
              <h2>Professional invoices ready to send in seconds</h2>
              <p>
                Every invoice is auto-numbered, tax-calculated, and includes
                your payment details and accepted methods. One click to
                download the PDF — or mark it paid to stamp it.
              </p>
              <ul className="lp-checklist">
                {['Sequential invoice numbers', 'Configurable tax rates per region', 'Wire, ACH, and online payment details', 'PAID stamp on settled invoices', 'Instant PDF download'].map(item => (
                  <li key={item}>
                    <span className="lp-check">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <InvoiceVisual />
          </div>

          <div className="lp-highlight reverse">
            <div className="lp-highlight-text">
              <div className="lp-section-label">Stock Control</div>
              <h2>Know exactly what you have — and when to reorder</h2>
              <p>
                Set reorder points per product. Get email and in-app alerts
                the moment stock falls below your threshold. One click to
                fire a purchase order straight to your supplier.
              </p>
              <ul className="lp-checklist">
                {['Real-time stock levels per variant', 'Reorder point alerts (email + in-app)', 'Adjustments: receive, damage, theft, write-off', 'Full movement history', 'One-click reorder to supplier'].map(item => (
                  <li key={item}>
                    <span className="lp-check">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <StockVisual />
          </div>

          <div className="lp-highlight">
            <div className="lp-highlight-text">
              <div className="lp-section-label">Access Control</div>
              <h2>Give every team member exactly the access they need</h2>
              <p>
                Five built-in roles so your warehouse staff can only touch
                inventory, your sales team can only see customers and orders,
                and your accountant gets reports without seeing anything else.
              </p>
              <ul className="lp-checklist">
                {['Admin, Manager, Sales, Warehouse, Finance roles', 'Activity log — who did what and when', 'Multiple staff accounts per company', 'No extra charge per seat'].map(item => (
                  <li key={item}>
                    <span className="lp-check">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <RoleVisual />
          </div>

        </div>
      </div>
    </section>
  )
}

// ── Pricing ────────────────────────────────────────────────────────
const PLANS = [
  {
    name: 'Starter',
    price: '$27',
    period: '/month',
    desc: 'Perfect for small shops and local retailers getting started.',
    features: [
      '3 staff accounts',
      '500 products',
      'Inventory & stock management',
      'Sales orders',
      'PDF invoice generation',
      'Basic dashboard',
      'Email support',
    ],
    cta: 'Get started',
    featured: false,
  },
  {
    name: 'Growth',
    price: '$69',
    period: '/month',
    desc: 'Built for wholesalers and distributors managing real volume.',
    features: [
      '10 staff accounts',
      'Unlimited products',
      'Everything in Starter',
      'Email invoice delivery',
      'Full reporting & margin tracking',
      'Supplier management',
      '1 outbound webhook',
      'LINE notifications',
    ],
    cta: 'Get started',
    featured: true,
  },
  {
    name: 'Business',
    price: '$165',
    period: '/month',
    desc: 'For larger operations with multiple locations and integrations.',
    features: [
      'Unlimited staff accounts',
      'Everything in Growth',
      'Multi-location & warehouses',
      'Customer self-service portal',
      'Full REST API access',
      'Unlimited webhooks',
      'AI demand forecasting',
      'Priority support',
    ],
    cta: 'Contact sales',
    featured: false,
  },
]

function Pricing() {
  return (
    <section id="pricing" className="lp-pricing">
      <div className="lp-container">
        <div className="lp-section-label">Pricing</div>
        <h2 className="lp-section-title">Simple, transparent pricing</h2>
        <p className="lp-section-sub">
          No hidden fees. No per-seat charges on Growth and Business.
          Cancel anytime.
        </p>
        <div className="lp-pricing-grid">
          {PLANS.map((plan) => (
            <div
              className={`lp-pricing-card${plan.featured ? ' featured' : ''}`}
              key={plan.name}
            >
              {plan.featured && (
                <div className="lp-pricing-badge">Most popular</div>
              )}
              <div className="lp-pricing-tier">{plan.name}</div>
              <div className="lp-pricing-price">
                {plan.price}
                <span>{plan.period}</span>
              </div>
              <p className="lp-pricing-desc">{plan.desc}</p>
              <ul className="lp-pricing-features">
                {plan.features.map((f) => (
                  <li key={f}>
                    <span className="lp-check">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="#"
                className={`lp-pricing-cta${plan.featured ? ' primary' : ' outline'}`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
        <p className="lp-pricing-note">
          Prices shown in USD. Thai Baht pricing available — contact us.
          All plans include a 14-day free trial.
        </p>
      </div>
    </section>
  )
}

// ── CTA ────────────────────────────────────────────────────────────
function CTA({ onStart }) {
  return (
    <section id="cta" className="lp-cta">
      <div className="lp-container">
        <h2>Ready to take control of your inventory?</h2>
        <p>Set up in minutes. No spreadsheets. No double-entry.</p>
        <div className="lp-cta-actions">
          <button className="lp-btn-cta-primary" onClick={onStart}>
            Start for free
            <Icon path={ICONS.arrow} />
          </button>
          <a href="#" className="lp-btn-cta-outline">Contact sales</a>
        </div>
      </div>
    </section>
  )
}

// ── Footer ─────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-container">
        <div className="lp-footer-inner">
          <div className="lp-footer-logo">
            <span className="lp-logo-mark">
              <svg viewBox="0 0 24 24"><path d="M3 12l9-9 9 9M5 10v10h14V10" /></svg>
            </span>
            Invmatics Systems
          </div>
          <ul className="lp-footer-links">
            <li><a href="#">Features</a></li>
            <li><a href="#">Pricing</a></li>
            <li><a href="#">Privacy</a></li>
            <li><a href="#">Terms</a></li>
          </ul>
          <div className="lp-footer-right">
            <span className="lp-footer-copy">© 2026 Invmatics Systems</span>
            <span className="lp-footer-brand">A product of KuiHua Technologies</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ── Page ───────────────────────────────────────────────────────────
export default function Landing({ onStart }) {
  return (
    <>
      <Nav onStart={onStart} />
      <Hero onStart={onStart} />
      <Stats />
      <Features />
      <Highlights />
      <Pricing />
      <CTA onStart={onStart} />
      <Footer />
    </>
  )
}