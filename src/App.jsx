import { useEffect } from 'react';
import { useAuth } from '@clerk/react';
import Landing    from './pages/Landing';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import AppShell   from './AppShell';
import Legal      from './pages/Legal';

function LoadingScreen() {
  // Same markup as the static splash in index.html, so there is no flash between them.
  return (
    <div className="im-boot">
      <svg className="im-boot-mark" width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="#059669" />
        <polygon points="32,10 52,21 32,32 12,21" fill="#fff" />
        <polygon points="12,24 30,34.5 30,55 12,44.5" fill="#fff" fillOpacity=".9" />
        <polygon points="52,24 34,34.5 34,55 52,44.5" fill="#fff" fillOpacity=".5" />
        <path d="M15.5 38.5 L20.5 44 L27 36" fill="none" stroke="#059669" strokeWidth="4.5"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="im-boot-name">Invmatics</div>
    </div>
  );
}

export default function App() {
  const { isSignedIn, isLoaded } = useAuth();
  const path = window.location.pathname;

  useEffect(() => {
    if (!isLoaded) return;
    if ((path.startsWith('/sign-in') || path.startsWith('/sign-up')) && isSignedIn) {
      window.location.href = '/app';
    } else if (path.startsWith('/app') && isSignedIn === false) {
      window.location.href = '/sign-in';
    } else if (path === '/' && isSignedIn) {
      window.location.href = '/app';
    }
  }, [isLoaded, isSignedIn, path]);

  // Public legal pages: no need to wait for sign-in to load
  if (path === '/privacy' || path === '/privacy/') return <Legal kind="privacy" />;
  if (path === '/terms' || path === '/terms/') return <Legal kind="terms" />;

  if (!isLoaded) return <LoadingScreen />;

  // ── Sign-in ──────────────────────────────────────────────────────
  if (path.startsWith('/sign-in')) {
    if (isSignedIn) return null;
    return <SignInPage />;
  }

  // ── Sign-up ──────────────────────────────────────────────────────
  if (path.startsWith('/sign-up')) {
    if (isSignedIn) return null;
    return <SignUpPage />;
  }

  // ── Protected app ────────────────────────────────────────────────
  if (path.startsWith('/app')) {
    if (!isSignedIn) return null;
    return <AppShell />;
  }

  // ── Landing ──────────────────────────────────────────────────────
  if (isSignedIn) return null;
  return <Landing onStart={() => { window.location.href = '/sign-up'; }} />;
}
