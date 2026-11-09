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
import { getTheme, saveTheme, applyTheme } from './lib/theme';
import { MoneyProvider } from './lib/MoneyProvider';
import Delivery from './pages/Delivery';
import Help from './pages/Help';
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
  delivery:  Delivery,
  help:      Help,
  settings:  Settings,
};

export default function AppShell() {
  const [page, setPage] = useState('dashboard');
  const { signOut } = useAuth();
  const api = useApi();

  // Access code from sign-up: if the account still got its own organisation, move it into
  // the inviting one, then reload so everything reads the right organisation.
  useEffect(() => {
    let code = null;
    try { code = localStorage.getItem('im_join_code'); } catch { /* ignore */ }
    if (!code) return;
    (async () => {
      try {
        const r = await api.post('/staff/join', { code });
        try { localStorage.removeItem('im_join_code'); } catch { /* ignore */ }
        if (r?.joined) window.location.reload();
      } catch (e) {
        try { localStorage.removeItem('im_join_code'); } catch { /* ignore */ }
        console.warn('Access code not applied:', e.message);
      }
    })();
  }, [api]);
  const { userId } = useAuth();
  // Last known role for this user, so a refresh shows the full menu immediately
  const [role, setRole] = useState(() => readCache(userId, 'role'));
  const [navOpen, setNavOpen] = useState(false);
  const [theme, setTheme] = useState(getTheme);

  // dark theme applies to the app only: set while the shell is mounted, cleared on leaving
  useEffect(() => {
    applyTheme(theme);
    return () => applyTheme('light');
  }, [theme]);
  const toggleTheme = () => setTheme(t => { const n = t === 'dark' ? 'light' : 'dark'; saveTheme(n); return n; });
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

  // On phones the detail panel stacks under the list: bring it into view when a row is tapped.
  useEffect(() => {
    const onClick = (e) => {
      if (window.innerWidth > 900 || !e.target.closest?.('.im-list-row')) return;
      setTimeout(() => document.querySelector('.im-split-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  // Only pages this role may open (the API enforces it too)
  const PageComponent = (role === null || canOpen(role, page)) ? (PAGES[page] || Placeholder) : NoAccess;

  return (
    <div className="im-shell">
      <Sidebar
        active={page}
        role={role}
        theme={theme}
        onToggleTheme={toggleTheme}
        open={navOpen}
        onClose={() => setNavOpen(false)}
        onNavigate={(k) => { setPage(k); setNavOpen(false); }}
        onSignOut={() => { clearCache(); signOut({ redirectUrl: '/' }); }}
      />
      <div className="im-main">
        <Topbar page={page} onMenu={() => setNavOpen(true)} />
        <main className="im-content">
          {roleError && role === null && (
            <div className="im-error" style={{ marginBottom: 12 }}>
              Couldn't load your permissions, so the menu is limited: {roleError}{' '}
              <button className="im-btn-ghost" onClick={() => { setRoleError(null); setRoleTry(n => n + 1); }}>Retry</button>
            </div>
          )}
          <MoneyProvider><PageComponent /></MoneyProvider>
        </main>
      </div>
    </div>
  );
}
