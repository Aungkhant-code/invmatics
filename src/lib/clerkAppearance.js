// Shared look for Clerk's <SignIn /> and <SignUp /> — matches the dark Invmatics theme.
// (Plain .js file on purpose: keeps the page components free of non-component exports.)
export const CLERK_APPEARANCE = {
  variables: {
    colorPrimary:         '#059669',
    colorBackground:      '#1E293B',
    colorText:            '#F1F5F9',
    colorTextSecondary:   '#94A3B8',
    colorInputBackground: '#0F172A',
    colorInputText:       '#F1F5F9',
    borderRadius:         '8px',
  },
  elements: {
    card: {
      boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)',
      border:    '1px solid #334155',
    },
  },
};
