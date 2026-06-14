import { NAV } from './nav';

export default function Topbar({ page }) {
  const label = NAV.flatMap(n => n.children ? [n, ...n.children] : [n])
    .find(n => n.key === page)?.label || 'Dashboard';

  return (
    <header className="im-topbar">
      <div className="im-topbar-left">
        <h1 className="im-page-title">{label}</h1>
      </div>
      <div className="im-topbar-right">
        <div className="im-company-name">Somchai Trading Co.</div>
        <div className="im-avatar">ST</div>
      </div>
    </header>
  );
}
