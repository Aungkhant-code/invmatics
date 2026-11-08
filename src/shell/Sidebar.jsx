import { useState } from 'react';
import { Icon, ICONS } from './Icon';
import { navFor } from './nav';
import LogoGlyph from '../components/shared/Logo';

export default function Sidebar({ active, onNavigate, role, open, onClose, theme, onToggleTheme }) {
  const nav = navFor(role);
  const [expanded, setExpanded] = useState({ inventory: true, orders: false });

  function toggle(key) {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <>
    <div className={`im-backdrop ${open ? 'open' : ''}`} onClick={onClose} />
    <aside className={`im-sidebar ${open ? 'open' : ''}`}>
      <div className="im-sidebar-logo">
        <div className="im-logo-mark"><LogoGlyph size={20} /></div>
        <span className="im-logo-text">Invmatics</span>
      </div>

      <nav className="im-nav">
        {nav.map(item => (
          <div key={item.key}>
            <button
              className={`im-nav-item ${active === item.key || (item.children && item.children.some(c => c.key === active)) ? 'active' : ''}`}
              onClick={() => {
                if (item.children) toggle(item.key);
                else onNavigate(item.key);
              }}
            >
              <span className="im-nav-icon">
                <Icon d={ICONS[item.icon]} size={17} />
              </span>
              <span className="im-nav-label">{item.label}</span>
              {item.children && (
                <span className={`im-nav-chevron ${expanded[item.key] ? 'open' : ''}`}>
                  <Icon d={ICONS.chevron} size={13} />
                </span>
              )}
            </button>
            {item.children && expanded[item.key] && (
              <div className="im-nav-children">
                {item.children.map(child => (
                  <button
                    key={child.key}
                    className={`im-nav-child ${active === child.key ? 'active' : ''}`}
                    onClick={() => onNavigate(child.key)}
                  >
                    {child.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="im-sidebar-bottom">
        <button className="im-theme-toggle" role="switch" aria-checked={theme === 'dark'} onClick={onToggleTheme}>
          <span className="im-nav-icon">
            <Icon d={theme === 'dark'
              ? 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z'
              : 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z'} size={16} />
          </span>
          <span className="im-nav-label">Dark mode</span>
          <span className={`im-switch ${theme === 'dark' ? 'on' : ''}`} />
        </button>
        <button className={`im-help-link ${active === 'help' ? 'active' : ''}`} onClick={() => onNavigate('help')}>
          <span className="im-nav-icon">
            <Icon d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" size={16} />
          </span>
          <span className="im-nav-label">Help & Support</span>
        </button>
      </div>
    </aside>
    </>
  );
}
