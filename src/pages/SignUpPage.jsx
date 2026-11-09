/**
 * pages/SignUpPage.jsx — Clerk sign-up
 * Served at /sign-up. Sub-paths such as /sign-up/verify-email-address are
 * used by Clerk's multi-step flow, so the router must match by prefix.
 * An optional access code is stored in the user's unsafe_metadata; the backend
 * validates it when provisioning and puts the user in the inviting organisation.
 */

import { useState } from 'react';
import { SignUp } from '@clerk/react';
import AuthLayout from './AuthLayout';
import { CLERK_APPEARANCE } from '../lib/clerkAppearance';

export default function SignUpPage() {
  const [code, setCode] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('code') || ''; } catch { return ''; }
  });
  const clean = code.trim();

  return (
    <AuthLayout>
      <div style={{ maxWidth: 400, margin: '0 auto 14px', width: '100%' }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          Joining a team? Enter your access code
        </label>
        <input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="Optional, e.g. K7QM-4X2P"
          autoComplete="off"
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 15, letterSpacing: 1,
                   border: '1px solid var(--border, #d1d5db)', background: 'var(--input-bg, #fff)', color: 'inherit' }}
        />
      </div>
      <SignUp
        key={clean}
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/app"
        unsafeMetadata={clean ? { join_code: clean } : {}}
        appearance={CLERK_APPEARANCE}
      />
    </AuthLayout>
  );
}
