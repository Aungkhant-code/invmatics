import { useEffect } from 'react';
import { useAuth } from '@clerk/react';
import Landing    from './pages/Landing';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import AppShell   from './AppShell';

function LoadingScreen() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#0F172A',
    }}>
      <div style={{ color: '#10B981', fontSize: 14, fontFamily: 'sans-serif' }}>
        Loading...
      </div>
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
