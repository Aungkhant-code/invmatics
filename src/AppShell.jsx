import { useState } from 'react';
import { useAuth } from '@clerk/react';
import './AppShell.css';

import Sidebar from './shell/Sidebar';
import Topbar  from './shell/Topbar';

import Dashboard from './pages/Dashboard';
import Catalog   from './pages/Catalog';
import Inventory from './pages/Inventory';
import Orders    from './pages/Orders';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Invoices  from './pages/Invoices';
import Analytics from './pages/Analytics';
import Staff     from './pages/Staff';

function Placeholder({ page }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', color: '#6B7280', fontFamily: 'sans-serif', fontSize: 14,
    }}>
      {page} — coming soon
    </div>
  );
}

const PAGES = {
  dashboard: Dashboard,
  catalog:   Catalog,
  inventory: Inventory,
  orders:    Orders,
  customers: Customers,
  suppliers: Suppliers,
  invoices:  Invoices,
  analytics: Analytics,
  staff:     Staff,
};

export default function AppShell() {
  const [page, setPage] = useState('dashboard');
  const { signOut } = useAuth();

  const PageComponent = PAGES[page] || Placeholder;

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
          <PageComponent />
        </main>
      </div>
    </div>
  );
}
