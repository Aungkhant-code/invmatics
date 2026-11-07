import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/react';
import { clearCache, readCache, writeCache } from './lib/cache';
import './AppShell.css';

import Sidebar from './shell/Sidebar';
import { canOpen } from './shell/nav';
import { useApi } from './lib/api';
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
import StockMovements from './pages/StockMovements';
import LowStock  from './pages/LowStock';
import PurchaseOrders from './pages/PurchaseOrders';
import Settings from './pages/Settings';

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

function NoAccess() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%',
      color: '#6B7280', fontFamily: 'sans-serif', fontSize: 14, textAlign: 'center', padding: 24 }}>
      Your role doesn't have access to this page. Ask an admin if you need it.
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
  // sidebar keys (shell/nav.js)
  products:  Catalog,
  movements: StockMovements,
  lowstock:  LowStock,
  sales:     Orders,
  purchase:  PurchaseOrders,
  reports:   Analytics,
  settings:  Settings,
};

export default function AppShell() {
  const [page, setPage] = useState('dashboard');
  const { signOut } = useAuth();
  const api = useApi();
  const { userId } = useAuth();
  // Last known role for this user, so a refresh shows the full menu immediately
  const [role, setRole] = useState(() => readCache(userId, 'role'));
  const [roleError, setRoleError] = useState(null);
  const [roleTry, setRoleTry] = useState(0);

  // Who am I? Decides which pages the sidebar offers.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await api.get('/auth/me');
        if (cancelled) return;
        setRole(me.role);
        setRoleError(null);
        writeCache(userId, 'role', me.role);
      } catch (e) {
        if (!cancelled) setRoleError(e.message || 'Request failed');
      }
    })();
    return () => { cancelled = true; };
  }, [api, userId, roleTry]);

  // Only pages this role may open (the API enforces it too)
  const PageComponent = (role === null || canOpen(role, page)) ? (PAGES[page] || Placeholder) : NoAccess;

  return (
    <div className="im-shell">
      <Sidebar
        active={page}
        role={role}
        onNavigate={setPage}
        onSignOut={() => { clearCache(); signOut({ redirectUrl: '/' }); }}
      />
      <div className="im-main">
        <Topbar page={page} />
        <main className="im-content">
          {roleError && role === null && (
            <div className="im-error" style={{ marginBottom: 12 }}>
              Couldn't load your permissions, so the menu is limited: {roleError}{' '}
              <button className="im-btn-ghost" onClick={() => { setRoleError(null); setRoleTry(n => n + 1); }}>Retry</button>
            </div>
          )}
          <PageComponent />
        </main>
      </div>
    </div>
  );
}
