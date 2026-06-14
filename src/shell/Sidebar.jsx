import { useState } from 'react';
import { Icon, ICONS } from './Icon';
import { NAV } from './nav';

export default function Sidebar({ active, onNavigate }) {
  const [expanded, setExpanded] = useState({ inventory: true, orders: false });

  function toggle(key) {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <aside className="im-sidebar">
      <div className="im-sidebar-logo">
        <div className="im-logo-mark">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12l9-9 9 9M5 10v10h14V10" />
          </svg>
        </div>
        <span className="im-logo-text">Invmatics</span>
      </div>

      <nav className="im-nav">
        {NAV.map(item => (
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
        <button className="im-help-link">
          <span className="im-nav-icon">
            <Icon d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" size={16} />
          </span>
          <span className="im-nav-label">Help & Support</span>
        </button>
      </div>
    </aside>
  );
}
