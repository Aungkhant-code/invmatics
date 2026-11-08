/**
 * pages/AuthLayout.jsx — shared frame for the sign-in and sign-up pages
 * Brand mark on top, Clerk's form in the middle, link back to the landing page.
 */

import './AuthPages.css';

export default function AuthLayout({ children }) {
  return (
    <div className="im-auth">
      <a className="im-auth-brand" href="/" aria-label="Invmatics home">
        <span className="im-auth-logo" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12l9-9 9 9M5 10v10h14V10" /></svg>
        </span>
        <span className="im-auth-name">Invmatics</span>
      </a>

      {children}

      <a className="im-auth-back" href="/">← Back to home</a>
    </div>
  );
}
