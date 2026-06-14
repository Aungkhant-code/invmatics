import { useState } from 'react';
import './AppShell.css';
import Sidebar      from './shell/Sidebar';
import Topbar       from './shell/Topbar';
import Dashboard    from './shell/Dashboard';
import Products     from './shell/Products';
import SalesOrders     from './shell/SalesOrders';
import PurchaseOrders  from './shell/Purchaseorders';
import StockMovements  from './shell/Stockmovements';
import LowStock        from './shell/LowStock';
import Invoices        from './shell/Invoices';
import Customers       from './shell/customers';
import Suppliers       from './shell/Suppliers';
import Reports         from './shell/Reports';
import Settings        from './shell/Settings';
import Placeholder     from './shell/Placeholder';

export default function AppShell() {
  const [page, setPage] = useState('dashboard');

  return (
    <div className="im-shell">
      <Sidebar active={page} onNavigate={setPage} />
      <div className="im-main">
        <Topbar page={page} />
        <main className="im-content">
          {page === 'dashboard' ? <Dashboard />          :
           page === 'products'  ? <Products />           :
           page === 'sales'     ? <SalesOrders />        :
           page === 'purchase'  ? <PurchaseOrders />     :
           page === 'movements' ? <StockMovements />     :
           page === 'lowstock'  ? <LowStock />          :
           page === 'invoices'  ? <Invoices />          :
           page === 'customers' ? <Customers />         :
           page === 'suppliers' ? <Suppliers />         :
           page === 'reports'   ? <Reports />           :
           page === 'settings'  ? <Settings />          :
           <Placeholder page={page} />}
        </main>
      </div>
    </div>
  );
}
