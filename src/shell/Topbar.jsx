import { useEffect, useState } from 'react';
import { UserButton, useUser } from '@clerk/react';
import { useApi } from '../lib/api';
import { NAV } from './nav';

export default function Topbar({ page, onMenu }) {
  const label = NAV.flatMap(n => n.children ? [n, ...n.children] : [n])
    .find(n => n.key === page)?.label || (page === 'help' ? 'Help & Support' : 'Dashboard');
  const { user } = useUser();
  const api = useApi();
  const [orgName, setOrgName] = useState('');

  // The organisation name lives in our own settings; refresh it when Settings saves.
  useEffect(() => {
    let cancelled = false;
    const load = () => api.get('/settings')
      .then(d => { if (!cancelled) setOrgName(d?.organisation?.name || ''); })
      .catch(() => {});
    load();
    window.addEventListener('im-org-updated', load);
    return () => { cancelled = true; window.removeEventListener('im-org-updated', load); };
  }, [api]);

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
          {orgName || user?.organizationMemberships?.[0]?.organization?.name || user?.fullName || ''}
        </span>
        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}
