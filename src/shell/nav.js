// Sidebar structure. `roles` limits who sees an item (the API enforces the same rules in
// backend/permissions.py — hiding here is convenience, not security).
const ALL   = ['admin', 'manager', 'sales', 'warehouse', 'finance'];
const MGMT  = ['admin', 'manager'];

export const NAV = [
  { label: 'Dashboard',  icon: 'dashboard', key: 'dashboard', roles: ALL },
  { label: 'Inventory',  icon: 'inventory', key: 'inventory', roles: ALL,
    children: [
      { label: 'Products',        key: 'products',  roles: ALL },
      { label: 'Stock Movements', key: 'movements', roles: ALL },
      { label: 'Low Stock',       key: 'lowstock',  roles: ALL },
    ]
  },
  { label: 'Orders',     icon: 'orders',    key: 'orders', roles: ALL,
    children: [
      { label: 'Sales Orders',    key: 'sales',    roles: ALL },
      { label: 'Purchase Orders', key: 'purchase', roles: [...MGMT, 'warehouse', 'finance'] },
    ]
  },
  { label: 'Delivery',   icon: 'orders',    key: 'delivery',  roles: ALL },
  { label: 'Invoices',   icon: 'invoices',  key: 'invoices',  roles: [...MGMT, 'sales', 'finance'] },
  { label: 'Customers',  icon: 'customers', key: 'customers', roles: [...MGMT, 'sales'] },
  { label: 'Suppliers',  icon: 'suppliers', key: 'suppliers', roles: [...MGMT, 'warehouse'] },
  { label: 'Reports',    icon: 'reports',   key: 'reports',   roles: [...MGMT, 'finance'] },
  { label: 'Team',       icon: 'customers', key: 'staff',     roles: ['admin'] },
  { label: 'Settings',   icon: 'settings',  key: 'settings',  roles: ['admin'] },
];

/** The nav a given role should see (parents with no visible children are dropped). */
export function navFor(role) {
  // Role not known yet (very first load): offer only what every role can open, so the
  // menu doesn't jump around much once the role arrives.
  const sees = (roles) => role ? roles.includes(role) : roles.length === ALL.length;
  return NAV
    .filter(i => sees(i.roles))
    .map(i => i.children ? { ...i, children: i.children.filter(c => sees(c.roles)) } : i)
    .filter(i => !i.children || i.children.length > 0);
}

/** Can this role open the page with this key? */
export function canOpen(role, key) {
  if (key === 'help') return true;          // everyone can reach Help & Support
  for (const i of NAV) {
    if (i.key === key) return i.roles.includes(role);
    const c = i.children?.find(x => x.key === key);
    if (c) return c.roles.includes(role);
  }
  return false;
}
