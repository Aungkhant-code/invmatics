import { Icon, ICONS } from './Icon';
import { NAV } from './nav';

export default function Placeholder({ page }) {
  const flat  = NAV.flatMap(n => n.children ? [n, ...n.children] : [n]);
  const item  = flat.find(n => n.key === page);
  const label = item?.label || page;
  const icon  = ICONS[item?.icon || 'dashboard'];

  return (
    <div className="im-placeholder">
      <div className="im-placeholder-icon">
        <Icon d={icon} size={32} />
      </div>
      <h2>{label}</h2>
      <p>This section is coming soon.</p>
    </div>
  );
}
