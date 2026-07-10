# Test Report — Dashboard Sync Skeleton (Demo Cache Fix)

**Date:** 2026-07-08
**Scope:** Fix post-login dashboard showing demo/cached fixture data during Drive sync; show skeleton until Drive confirms.

---

## Summary

| Suite | Tests | Result |
|---|---|---|
| `src/services/storage-context.test.tsx` | 4 | ✅ All pass |
| `src/app/dashboard/dashboard-page.test.tsx` | 3 | ✅ All pass |
| `src/services/offline-manifest-cache.test.ts` | 2 | ✅ All pass |
| `src/services/auth.test.ts` — signOut cache clear | 1 (new) | ✅ Pass |
| Full vitest suite | 305 | ✅ All pass |
| `e2e/dashboard.spec.ts` (chromium) | 8 | ✅ All pass |

---

## Root Cause

1. **Demo cache pollution** — `DemoLayout` used `StorageProvider`, which persisted `DEMO_MANIFEST` to the shared IndexedDB `"latest"` key after every successful read.
2. **Stale-while-revalidate UI hydration** — On cache hit, `loadManifest()` immediately exposed cached data while `loading: true`, so `DashboardPage` skipped `DashboardSkeleton` and rendered fixture projects during the Drive round-trip.

---

## Changes Made

| File | Change |
|---|---|
| `src/services/storage-context.tsx` | Added `persistOfflineCache` prop (default `true`); removed early cache hydration; cache used only as offline/error fallback |
| `src/app/demo/layout.tsx` | `persistOfflineCache={false}` — demo reads never write IndexedDB |
| `src/services/auth.ts` | `signOut()` calls `clearManifestCache()` to prevent cross-session cache bleed |
| `src/app/dashboard/dashboard-page.tsx` | Added `data-testid="dashboard-skeleton"` for E2E assertions |
| `e2e/fixtures/manifest-cache.ts` (new) | `seedManifestCache()` helper for regression tests |
| `e2e/fixtures/mock-drive.ts` | Optional `readDelayMs` for observable loading states |

---

## Key Test Evidence

### Unit — cached manifest not exposed during Drive fetch

`storage-context.test.tsx` seeds IndexedDB with `DEMO_MANIFEST`, delays `readManifest()`, and asserts `manifest` stays `null` until Drive confirms.

### E2E — D5 regression (demo cache pollution)

**Scenario:** IndexedDB pre-seeded with `FIXTURE_MANIFEST` (simulates prior demo visit), auth token seeded, mock Drive returns `EMPTY_MANIFEST` after 2 s delay.

**Assertions during sync:**
- `dashboard-skeleton` visible
- "Complete Roof Replacement" **not** visible
- "$47,500" **not** visible

**Assertions after sync:**
- "No projects yet" empty state visible
- Skeleton hidden

```
✓ D5 — does not flash demo cached projects while Drive sync is in progress (2.4s)
```

---

## Requirements Satisfied

- **PERF-12** — Post-sign-in skeleton dashboard while manifest loads
- **DASH-05** — Skeleton cards/rows during loading, not cached demo content

---

## Not Changed (follow-up)

- Projects list/detail/export still use plain "Loading…" text (PERF-02)
- IndexedDB cache is not keyed by Google account email (mitigated by sign-out cache clear + deferred hydration)
