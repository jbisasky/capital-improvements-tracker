/**
 * Minimal window.google stub — kept only so sign-out revocation via the
 * GIS library still type-checks if the script is present. The PKCE auth
 * flow no longer depends on this library at runtime.
 */

// No longer exported — auth.ts uses fetch for revocation directly.
// File retained to avoid breaking any future GIS usage.

export {};
