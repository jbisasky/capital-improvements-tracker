/** Expected Cloudflare Pages `_headers` content (EARS SEC-03, HOST-02). */

export const REQUIRED_CSP_FRAGMENTS = [
  "default-src 'self'",
  "connect-src https://www.googleapis.com https://generativelanguage.googleapis.com https://accounts.google.com https://plausible.io https://api.honeycomb.io",
  "script-src 'self' https://accounts.google.com/gsi/client https://plausible.io",
  "frame-src https://accounts.google.com",
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
