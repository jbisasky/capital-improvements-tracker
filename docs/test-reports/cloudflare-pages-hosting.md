# Test Report: Cloudflare Pages Hosting Prep

**Scope:** `public/_headers`, `public/_redirects`, Plausible build-time injection, README deploy docs.

## Unit tests

**Command:** `npx vitest run src/hosting/`

| Test | Result |
| --- | --- |
| `injectPlausibleScript` inserts tag when domain set | PASSED |
| `injectPlausibleScript` omits tag when domain unset | PASSED |
| `injectPlausibleScript` throws on missing marker | PASSED |
| `_headers` contains required CSP + security headers | PASSED |
| `_redirects` contains SPA fallback rule | PASSED |

## Production build

**Command:** `npm run build`

- Build succeeded (`dist/` output).
- `dist/_headers` and `dist/_redirects` present (copied from `public/`).
- `dist/index.html` omits Plausible when `VITE_PLAUSIBLE_DOMAIN` is unset (expected local/preview default).

## E2E (Playwright)

**Command:** `npx playwright test e2e/landing.spec.ts`

| Test | Result |
| --- | --- |
| Hero text visible on mobile | PASSED |
| "See a demo" navigates to `/demo` | PASSED |
| Sign-in button visible and clickable | PASSED |
| Desktop ghost-layer layout screenshot | PASSED |
| Mobile layout screenshot | PASSED |

All five landing E2E tests pass after updating selectors for the current ghost-layer desktop layout and mobile frame/card test IDs.

## Manual next steps (not automated)

1. Create Cloudflare Pages project → connect GitHub repo.
2. Set build command `npm run build`, output `dist`, Node 24.
3. Add env vars: `VITE_GOOGLE_CLIENT_ID`, `VITE_PLAUSIBLE_DOMAIN` (optional), `VITE_HONEYCOMB_API_KEY` (optional).
4. Add production `*.pages.dev` origin to Google OAuth client.
