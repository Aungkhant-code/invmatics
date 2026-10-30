import { useState } from 'react';
import { useAuth } from '@clerk/react';
import './AppShell.css';

import Sidebar     from './shell/Sidebar';
import Topbar      from './shell/Topbar';
import Placeholder from './shell/Placeholder';

import Dashboard from './pages/Dashboard';
import Catalog   from './pages/Catalog';
import Inventory from './pages/Inventory';
import Orders    from './pages/Orders';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Invoices  from './pages/Invoices';
import Analytics from './pages/Analytics';
import Staff     from './pages/Staff';

// Keys here must match the keys in shell/nav.js (that's what the sidebar emits).
// Anything not listed falls through to the "coming soon" placeholder.
const PAGES = {
  dashboard: { Component: Dashboard },
  products:  { Component: Catalog },
  movements: { Component: Inventory, props: { initialView: 'movements' } },
  lowstock:  { Component: Inventory, props: { lowOnly: true } },
  sales:     { Component: Orders },
  invoices:  { Component: Invoices },
  customers: { Component: Customers },
  suppliers: { Component: Suppliers },
  reports:   { Component: Analytics },
  staff:     { Component: Staff },
};

export default function AppShell() {
  const [page, setPage] = useState('dashboard');
  const { signOut } = useAuth();

  const entry = PAGES[page];

  return (
    <div className="im-shell">
      <Sidebar
        active={page}
        onNavigate={setPage}
        onSignOut={() => signOut({ redirectUrl: '/' })}
      />
      <div className="im-main">
        <Topbar page={page} />
        <main className="im-content">
          {entry
            ? <entry.Component key={page} {...(entry.props || {})} />
            : <Placeholder page={page} />}
        </main>
      </div>
    </div>
  );
}
