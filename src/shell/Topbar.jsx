import { UserButton, useUser } from '@clerk/react';
import { NAV } from './nav';

export default function Topbar({ page, onMenu }) {
  const label = NAV.flatMap(n => n.children ? [n, ...n.children] : [n])
    .find(n => n.key === page)?.label || (page === 'help' ? 'Help & Support' : 'Dashboard');
  const { user } = useUser();

  return (
    <header className="im-topbar">
      <div className="im-topbar-left">
        <button className="im-menu-btn" onClick={onMenu} aria-label="Open menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
        <h1 className="im-page-title">{label}</h1>
      </div>
      <div className="im-topbar-right">
        <span className="im-topbar-org">
          {user?.organizationMemberships?.[0]?.organization?.name || user?.fullName || ''}
        </span>
        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}
