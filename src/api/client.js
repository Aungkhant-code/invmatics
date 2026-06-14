// api/client.js
// Base HTTP client shared by all API modules
// - Base URL from environment variable
// - Attach JWT token from auth context to every request header
// - Handle 401 responses by redirecting to login
// - Centralised error handling and response parsing
