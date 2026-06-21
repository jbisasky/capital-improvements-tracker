# Test Report: Post-launch production smoke

**Target:** https://capital-improvements-tracker.pages.dev/
**Date:** 2026-06-21
**Method:** Automated HTTP checks + Playwright (`e2e/production-smoke.spec.ts`)

## Automated HTTP checks

| Check | Result |
| --- | --- |
| `/` returns 200 with built assets (`/assets/index-*.js`) | PASSED |
| CSP header present (`content-security-policy`) | PASSED |
| HSTS header present | PASSED |
| `/demo` returns 200 with SPA shell | PASSED |
| `/demo/projects` deep link returns 200 (SPA fallback) | PASSED |
| `og:image` points to `/og-image.jpg` | PASSED |
| Plausible script injected | PASSED |
| `/og-image.jpg` returns 200 | PASSED |

## Playwright (production)

| Test | Result |
| --- | --- |
| Landing loads hero + sign-in | PASSED |
| Demo CTA navigates to `/demo` | PASSED |
| Demo dashboard shows fixture data | PASSED |

## Manual (requires Google OAuth — operator)

- [ ] `VITE_GOOGLE_CLIENT_ID` set on Cloudflare Pages
- [ ] `https://capital-improvements-tracker.pages.dev` in OAuth Authorized JavaScript origins
- [ ] Sign-in completes; `manifest.json` bootstraps in Drive `appDataFolder`
- [ ] BYOK key + receipt extraction on a live project

See [docs/google-cloud-setup.md §7](../google-cloud-setup.md) for the full checklist.
