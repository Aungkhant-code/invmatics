/**
 * pages/SignUpPage.jsx — Clerk sign-up
 * Served at /sign-up. Sub-paths such as /sign-up/verify-email-address are
 * used by Clerk's multi-step flow, so the router must match by prefix.
 * Creating an account fires Clerk's user.created webhook, which provisions
 * the organisation and user row on the backend.
 */

import { SignUp } from '@clerk/react';
import AuthLayout from './AuthLayout';
import { CLERK_APPEARANCE } from '../lib/clerkAppearance';

export default function SignUpPage() {
  return (
    <AuthLayout>
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/app"
        appearance={CLERK_APPEARANCE}
      />
    </AuthLayout>
  );
}
