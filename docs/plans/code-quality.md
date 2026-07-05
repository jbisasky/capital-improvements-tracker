# Code Quality Improvements

**Last updated:** 2026-07-04

Tracks refactoring, naming, and structural improvements that don't affect runtime behavior but improve codebase consistency and maintainability.

---

## Execution Plan (Step-by-Step with Validation)

**Workflow:** Complete each step below in order. After each step:
1. Make code changes
2. Run unit tests (`npm run test`)
3. Run E2E tests (`npm run e2e`)
4. Verify app still builds and runs (`npm run build && npm run preview`)
5. Commit with a clear message
6. Move to next step

---

## Items

### 1. Standardize page file naming convention

**Finding:** Page files are inconsistently named across `src/app/`. Some use the generic `page.tsx` (borrowed from Next.js conventions), while others already use semantic names. Your app uses React Router v7 — file names have no routing significance, so naming should be semantic and consistent.

**Current state:**

```
src/app/
├── landing/
│   └── page.tsx                  ← generic (Next.js convention)
├── dashboard/
│   └── page.tsx                  ← generic
├── projects/
│   ├── list-page.tsx             ← semantic ✅
│   ├── detail-page.tsx           ← semantic ✅
│   ├── new-page.tsx              ← semantic ✅
│   └── edit-page.tsx             ← semantic ✅
├── settings/
│   ├── page.tsx                  ← generic
│   └── diagnostics-page.tsx      ← semantic ✅
├── export/
│   └── page.tsx                  ← generic
├── about/
│   └── page.tsx                  ← generic
└── auth/
    └── callback-page.tsx         ← semantic ✅
```

**Target state (rename generics to semantic names):**

```
src/app/
├── landing/
│   └── landing-page.tsx
├── dashboard/
│   └── dashboard-page.tsx
├── settings/
│   └── settings-page.tsx
├── export/
│   └── export-page.tsx
└── about/
    └── about-page.tsx
```

**Files to rename:**

| From | To |
|------|----|
| `src/app/landing/page.tsx` | `src/app/landing/landing-page.tsx` |
| `src/app/dashboard/page.tsx` | `src/app/dashboard/dashboard-page.tsx` |
| `src/app/settings/page.tsx` | `src/app/settings/settings-page.tsx` |
| `src/app/export/page.tsx` | `src/app/export/export-page.tsx` |
| `src/app/about/page.tsx` | `src/app/about/about-page.tsx` |

**Files to update after rename:**

- `src/app/router.tsx` — all import paths

**Why `{name}-page.tsx` over `{name}.tsx`:**
- Matches the existing semantic files in the repo (`list-page.tsx`, `detail-page.tsx`, etc.)
- Explicit "page" suffix distinguishes route-level components from sub-components
- Unambiguous in IDE tabs (no collision with `landing.tsx` style)

**Effort:** Low (rename + update imports, IDE refactoring handles most of it)
**Risk:** Low (no runtime behavior changes, just imports)
**Status:** ✅ Done

---

### 2. Add unit tests for `src/services/auth-context.tsx`

**Finding:** `auth.ts` has 405 lines of unit tests (`auth.test.ts`) covering the PKCE state machine, but the React context layer (`auth-context.tsx`) has no test file at all.

**Why it matters:** The analytics transition detection (`usePrevious` + `authenticating → authenticated`) is logic that exists only in the context layer — it's not covered by `auth.test.ts`. A page refresh falsely firing a `trackSignIn()` event would be invisible without a test.

**Recommended test cases (priority order):**

| # | Test | Why |
|---|------|-----|
| 1 | Analytics fires on `authenticating → authenticated` transition | Core behavior, unique to context layer |
| 2 | Analytics does NOT fire on page refresh (status starts at `authenticated`) | Guards against the usePrevious regression case |
| 3 | `useAuth()` outside `AuthProvider` throws with clear message | Guards against bad DX for future consumers |
| 4 | Auth state (`status`, `isAuthenticated`, `error`) is exposed correctly | Basic contract test |
| 5 | `unsubscribe()` is called on unmount | Guards against memory leak |
| 6 | `handleRedirectCallback()` is called on mount | Guards against OAuth callback being skipped |

**Setup notes:**
- Use `@testing-library/react` (`renderHook` + `act`)
- Mock `@/services/auth` module (vi.mock) to control state transitions
- Mock `@/services/analytics` to assert `trackSignIn()` call count

**Example skeleton:**
```typescript
// auth-context.test.tsx
import { renderHook, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "./auth-context";
import * as auth from "@/services/auth";
import * as analytics from "@/services/analytics";

vi.mock("@/services/auth");
vi.mock("@/services/analytics");

describe("useAuth", () => {
  it("throws when used outside AuthProvider", () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth must be used within an AuthProvider"
    );
  });
});

describe("AuthProvider analytics", () => {
  it("fires trackSignIn on authenticating → authenticated transition", async () => {
    // Arrange: mock subscribe to capture the listener
    // Act: trigger state change from authenticating → authenticated
    // Assert: trackSignIn called once
  });

  it("does NOT fire trackSignIn on page refresh", async () => {
    // Arrange: mock getAuthState to return "authenticated" immediately
    // Act: mount AuthProvider
    // Assert: trackSignIn NOT called
  });
});
```

**Effort:** Medium (requires setting up React context mocking pattern)
**Risk:** Low (tests only, no production code changes)
**Status:** ⏳ Pending

---

### 3. Rename `ensureFreshToken` → `getAccessTokenAsync` in `src/services/auth.ts`

**Finding:** `ensureFreshToken` implies the function will attempt to refresh an expired token, which it doesn't. It's a thin `Promise.resolve()` wrapper around `getAccessToken()` — it returns the current valid token or `null`, with no refresh attempt.

**Why it matters:** The name misleads callers in `http.ts` and `http-raw.ts` into thinking a refresh is being attempted on their behalf. The comment even documents the limitation:

```typescript
// With PKCE redirect flow we can't silently obtain a token in the background.
// Callers should check auth status and redirect to sign-in if needed.
```

**Rename to:** `getAccessTokenAsync`

Signals "same as `getAccessToken` but returns a Promise — no refresh magic."

**Files to update:**

| File | Change |
|------|--------|
| `src/services/auth.ts` | Rename function declaration |
| `src/services/http.ts` | Update import + call site (line 8, 101) |
| `src/services/http-raw.ts` | Update import + call site (line 8, 73) |
| `src/services/auth.test.ts` | Update any test references |

**Effort:** Low (mechanical rename across 3–4 files)
**Risk:** Low (rename only, no behavior change)
**Status:** ⏳ Pending

---

### 4. Fix misleading JSDoc on `handleRedirectCallback` in `src/services/auth.ts`

**Finding:** The JSDoc says the function "navigates to /dashboard (or the path stored before redirect)" but the function itself does not navigate anywhere — it only exchanges the code for a token and updates auth state. Navigation is the caller's responsibility (`AuthCallbackPage`).

**Current JSDoc (line 264–270):**
```typescript
/**
 * Call once on app mount (inside AuthProvider). If the current URL looks like
 * an OAuth callback (?code=...) it exchanges the code for a token, then
 * navigates to /dashboard (or the path stored before redirect).
 *
 * Returns true if a callback was handled, false otherwise.
 */
```

**Suggested fix:**
```typescript
/**
 * Call once on app mount (inside AuthProvider). If the current URL looks like
 * an OAuth callback (?code=...) it exchanges the code for a token and updates
 * auth state. Navigation after a successful exchange is the caller's
 * responsibility.
 *
 * Returns true if a callback was handled, false otherwise.
 */
```

**Effort:** Trivial (comment edit only)
**Risk:** None
**Status:** ⏳ Pending

These are not actionable yet — just things to keep in mind as the codebase grows.

### `src/services/` subdirectory grouping

Currently 41 files in a flat `src/services/` folder. Manageable now, but when it hits ~50–60 files consider grouping by domain:

```
src/services/
├── auth/         auth.ts, auth-context.tsx, gis-types.ts
├── storage/      storage-driver.ts, drive-storage-driver.ts, mock-storage-driver.ts, drive-attachment.ts, storage-context.tsx
├── ai/           gemini.ts, gemini-key.ts, gemini-extraction-batch.ts, ai-budget.ts
├── offline/      offline-context.tsx, offline-error.ts, offline-manifest-cache.ts, pwa-cache.ts, register-service-worker.ts
├── theme/        theme.ts, theme-context.tsx
├── observability/ analytics.ts, telemetry.ts, diagnostics.ts
└── http/         http.ts, http-raw.ts
```

Main cost is updating all import paths — worth doing in one focused PR when the time comes.

---

### `usePrevious` → `src/hooks/use-previous.ts`

`usePrevious<T>()` is currently a private helper at the bottom of `src/services/auth-context.tsx`. It's generic and reusable, but only has one usage today so it stays put. If a second provider or component ever needs "previous value" tracking, extract it to `src/hooks/use-previous.ts` rather than duplicating it.

---

## Actionable Items (from auth.ts vibe-coding cleanup)

### 5. Delete `src/services/gis-types.ts` (dead file)

**Finding:** `gis-types.ts` is a tombstone from when auth used the Google Identity Services (GIS) library. It now exports nothing (`export {}`) and nothing imports it. The comment inside even says "auth.ts uses fetch for revocation directly."

```typescript
// No longer exported — auth.ts uses fetch for revocation directly.
// File retained to avoid breaking any future GIS usage.
export {};
```

**Action:** Delete the file.

**Verification:** `rg gis-types src/` returns zero results — confirmed nothing imports it.

**Effort:** Trivial
**Risk:** Zero
**Status:** ⏳ Pending

---

### 6. Remove `"refreshing"` dead status from `src/services/auth.ts`

**Finding:** `"refreshing"` appears in the `AuthStatus` union and is set for one tick in `silentRefresh()` before being immediately overwritten with `"needs_interaction"`. No consumer outside `auth.ts` ever checks for `"refreshing"` — confirmed by codebase search.

**The dead code path:**
```typescript
// silentRefresh() — lines 350-363
state = { ...state, status: "refreshing" };  // Set
notify();
clearTokenFromSession();
state = { status: "needs_interaction", ... }; // Immediately overwritten
notify();
```

This is a leftover from when silent refresh was planned to do real async work. Now it flashes so briefly no consumer can react to it.

**Actions:**
1. Remove `| "refreshing"` from `AuthStatus` union (line 41)
2. Remove the `state = { status: "refreshing" }` + `notify()` lines from `silentRefresh()`
3. Check `auth.test.ts` for any assertions on `"refreshing"` status and remove them

**Effort:** Low
**Risk:** Low (no consumer checks for this status)
**Status:** ⏳ Pending

---

## Completed Items

- [x] **Item 1:** Renamed `landing/page.tsx`, `dashboard/page.tsx`, `settings/page.tsx`, `export/page.tsx`, `about/page.tsx` to semantic `*-page.tsx` names. Updated `router.tsx`, `demo/dashboard-page.tsx`, and 3 test files. 258/258 tests pass.
