/**
 * pages/AuthLayout.jsx — shared frame for the sign-in and sign-up pages
 * Brand mark on top, Clerk's form in the middle, link back to the landing page.
 */

import './AuthPages.css';
import LogoGlyph from '../components/shared/Logo';

export default function AuthLayout({ children }) {
  return (
    <div className="im-auth">
      <a className="im-auth-brand" href="/" aria-label="Invmatics home">
        <span className="im-auth-logo" aria-hidden="true">
          <LogoGlyph size={20} />
        </span>
        <span className="im-auth-name">Invmatics</span>
      </a>

      {children}

      <a className="im-auth-back" href="/">← Back to home</a>
    </div>
  );
}
