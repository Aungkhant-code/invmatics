import { UserButton, useUser } from '@clerk/react';
import { NAV } from './nav';

export default function Topbar({ page }) {
  const label = NAV.flatMap(n => n.children ? [n, ...n.children] : [n])
    .find(n => n.key === page)?.label || 'Dashboard';
  const { user } = useUser();

  return (
    <header className="im-topbar">
      <div className="im-topbar-left">
        <h1 className="im-page-title">{label}</h1>
      </div>
      <div className="im-topbar-right">
        {user?.organizationMemberships?.[0]?.organization?.name ||
          user?.fullName || ''}
        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}
