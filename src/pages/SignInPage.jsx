/**
 * pages/SignInPage.jsx — Clerk sign-in
 * Served at /sign-in. Clerk's "path" routing also uses sub-paths
 * (e.g. /sign-in/factor-one), so the router must match by prefix.
 */

import { SignIn } from '@clerk/react';
import AuthLayout from './AuthLayout';
import { CLERK_APPEARANCE } from '../lib/clerkAppearance';

export default function SignInPage() {
  return (
    <AuthLayout>
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/app"
        appearance={CLERK_APPEARANCE}
      />
    </AuthLayout>
  );
}
