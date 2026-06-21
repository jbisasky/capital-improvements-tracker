# Test Report: Task 8 — PWA & offline read-only mode

**Scope:** Service worker, web manifest, IndexedDB manifest cache, offline banner, write guards, clear-local-data, production smoke, SEO static files, CI.

## Unit tests

**Command:** `npx vitest run src/services/offline-error.test.ts src/services/offline-context.test.tsx src/services/register-service-worker.test.ts src/services/clear-local-data.test.ts src/components/layout/offline-banner.test.tsx src/hosting/security-headers.test.ts`

| Area | Result |
| --- | --- |
| Offline write error helper | PASSED |
| OfflineProvider online/offline events | PASSED |
| OfflineBanner visibility | PASSED |
| Service worker registration helpers | PASSED |
| clearLocalDeviceData | PASSED |
| PWA + SEO public assets | PASSED |

## E2E

**Local:** `npx playwright test e2e/landing.spec.ts` — 5/5 passed

**Production:** `npx playwright test e2e/production-smoke.spec.ts --config=playwright.production.config.ts` — 3/3 passed

## Implementation summary

- [`public/sw.js`](../../public/sw.js) — precache shell, stale-while-revalidate assets, skip-waiting updates
- [`public/manifest.webmanifest`](../../public/manifest.webmanifest) — installable PWA metadata
- [`src/services/offline-manifest-cache.ts`](../../src/services/offline-manifest-cache.ts) — IndexedDB manifest cache (PWA-02)
- [`src/services/storage-context.tsx`](../../src/services/storage-context.tsx) — offline read + write guards (PWA-03/04/05)
- [`src/components/layout/offline-banner.tsx`](../../src/components/layout/offline-banner.tsx) — offline UX (ERR-06)
- [`public/robots.txt`](../../public/robots.txt), [`public/sitemap.xml`](../../public/sitemap.xml)
- [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) — vitest + production smoke on `main`

## Ops docs

- [docs/ops/plausible-setup.md](../ops/plausible-setup.md)
- [docs/ops/custom-domain.md](../ops/custom-domain.md)
- [docs/test-reports/post-launch-production-smoke.md](post-launch-production-smoke.md)
