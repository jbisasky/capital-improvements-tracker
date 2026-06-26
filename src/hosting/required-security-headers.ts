/**
 * Expected Cloudflare Pages `_headers` content (EARS SEC-03, HOST-02).
 *
 * With the PKCE redirect flow the token exchange goes to /api/auth/token
 * (same-origin Cloudflare Pages Function) — no longer https://accounts.google.com
 * or a GIS <script>. connect-src only needs oauth2.googleapis.com for token
 * revocation on sign-out.
 */

export const REQUIRED_CSP_FRAGMENTS = [
  "default-src 'self'",
  // Token exchange is same-origin (/api/auth/token). oauth2.googleapis.com is
  // still needed for the revoke call on sign-out. accounts.google.com and the
  // GIS script tag are no longer used.
  "connect-src 'self' https://www.googleapis.com https://generativelanguage.googleapis.com https://oauth2.googleapis.com https://plausible.io https://api.honeycomb.io",
  "script-src 'self' https://plausible.io",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
] as const;

export const REQUIRED_RESPONSE_HEADERS = [
  "Strict-Transport-Security:",
  "X-Content-Type-Options: nosniff",
  "Referrer-Policy: strict-origin-when-cross-origin",
] as const;

export const INDEX_HTML_CACHE_CONTROL = "Cache-Control: no-cache";
