// context/AuthContext.jsx
// React context for authentication state
// - Stores current user, role, and JWT token
// - Provides login / logout functions to the whole app
// - Persists token to localStorage on login, clears on logout
// - Guards private routes (redirect to /login if not authenticated)
