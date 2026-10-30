import { useEffect } from 'react';
import { useAuth, SignIn, SignUp } from '@clerk/react';
import Landing  from './pages/Landing';
import AppShell from './AppShell';

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

function AuthPage({ children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#0F172A',
    }}>
      {children}
    </div>
  );
}

const CLERK_APPEARANCE = {
  variables: {
    colorPrimary:         '#10B981',
    colorBackground:      '#1E293B',
    colorText:            '#F1F5F9',
    colorInputBackground: '#0F172A',
    colorInputText:       '#F1F5F9',
    borderRadius:         '8px',
  },
};

export default function App() {
  const { isSignedIn, isLoaded } = useAuth();
  const path = window.location.pathname;

  useEffect(() => {
    if (!isLoaded) return;
    if ((path === '/sign-in' || path === '/sign-up') && isSignedIn) {
      window.location.href = '/app';
    } else if (path.startsWith('/app') && isSignedIn === false) {
      window.location.href = '/sign-in';
    } else if (path === '/' && isSignedIn) {
      window.location.href = '/app';
    }
  }, [isLoaded, isSignedIn, path]);

  if (!isLoaded) return <LoadingScreen />;

  // ── Sign-in ──────────────────────────────────────────────────────
  if (path === '/sign-in') {
    if (isSignedIn) return null;
    return (
      <AuthPage>
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/app"
          appearance={CLERK_APPEARANCE}
        />
      </AuthPage>
    );
  }

  // ── Sign-up ──────────────────────────────────────────────────────
  if (path === '/sign-up') {
    if (isSignedIn) return null;
    return (
      <AuthPage>
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/app"
          appearance={CLERK_APPEARANCE}
        />
      </AuthPage>
    );
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
