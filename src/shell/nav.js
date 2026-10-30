export const NAV = [
  { label: 'Dashboard',  icon: 'dashboard', key: 'dashboard' },
  { label: 'Inventory',  icon: 'inventory', key: 'inventory',
    children: [
      { label: 'Products',        key: 'products'  },
      { label: 'Stock Movements', key: 'movements' },
      { label: 'Low Stock',       key: 'lowstock'  },
    ]
  },
  { label: 'Orders',     icon: 'orders',    key: 'orders',
    children: [
      { label: 'Sales Orders',    key: 'sales'    },
      { label: 'Purchase Orders', key: 'purchase' },
    ]
  },
  { label: 'Invoices',   icon: 'invoices',  key: 'invoices'   },
  { label: 'Customers',  icon: 'customers', key: 'customers'  },
  { label: 'Suppliers',  icon: 'suppliers', key: 'suppliers'  },
  { label: 'Reports',    icon: 'reports',   key: 'reports'    },
  { label: 'Settings',   icon: 'settings',  key: 'settings'   },
];
