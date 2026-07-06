# auth.spec.ts Implementation Plan

Implement the 7 Playwright auth scenarios (A1–A7) by creating shared fixtures for auth state seeding and Drive API mocking, then writing the spec itself.

---

## Files to create

```
e2e/
  fixtures/
    auth-state.ts      ← sessionStorage seed helper
    mock-drive.ts      ← page.route() helpers (Drive API)
    index.ts           ← extended test with authedPage fixture
  auth.spec.ts         ← 7 auth scenarios
```

---

## `e2e/fixtures/auth-state.ts`

Exports two helpers:
- `FAKE_TOKEN = "e2e-fake-token"` — constant used across specs
- `seedAuthToken(page)` — injects `auth_access_token` + `auth_expires_at` (1 hour from now) into `sessionStorage` via `page.addInitScript`. Must be called **before** `page.goto()`.
- `seedExpiredToken(page)` — same but with `auth_expires_at` in the past (for A5).

Uses `page.addInitScript` (runs before any page script) rather than `page.evaluate` (which runs after).

---

## `e2e/fixtures/mock-drive.ts`

Exports `setupMockDrive(page, options?)`:
- Intercepts `**/www.googleapis.com/drive/**` — returns a minimal manifest file list response on GET, and a mock `DriveFile` object on PATCH.
- Intercepts `**/www.googleapis.com/upload/drive/**` — returns a mock `DriveFile` on upload.
- Default manifest: empty projects list (sufficient for auth tests; later specs will pass fixture manifests).
- Also intercepts `https://oauth2.googleapis.com/revoke*` (sign-out token revocation) with a 200 so the `fetch` in `signOut()` doesn't fail.

---

## `e2e/fixtures/index.ts`

Extends Playwright `test` with an `authedPage` fixture that:
1. Calls `seedAuthToken(page)` (via `addInitScript`)
2. Calls `setupMockDrive(page)`
3. Navigates to `/dashboard`
4. Yields `page`

```ts
import { test as base } from "@playwright/test";
// ...
export const test = base.extend<{ authedPage: Page }>({ authedPage: ... });
export { expect } from "@playwright/test";
```

---

## `e2e/auth.spec.ts` — Scenario breakdown

### A1 — Sign-in redirects to Google
- Navigate to `/`
- Intercept navigation (`page.waitForRequest`) or use `page.on("request")` to detect a redirect toward `accounts.google.com`
- Click "Sign in with Google" button
- Assert the intercepted URL contains `accounts.google.com/o/oauth2/v2/auth`
- **Note**: `signIn()` calls `window.location.href = ...`. Playwright catches this as a navigation; use `page.waitForURL(/accounts\.google\.com/)` with a `{ waitUntil: "commit" }` option, or abort the navigation with `page.route` to avoid actually leaving.

### A2 — Auth guard: unauthenticated → redirected to `/`
- No token seeded
- Navigate to `/dashboard`
- Assert `page.url()` ends at `/` (landing page shown)

### A3 — Auth guard: authenticated → dashboard renders
- Use `authedPage` fixture (token seeded + Drive mocked)
- Assert heading or nav element from `AppShell` is visible

### A4 — Sign-out → `/?signed_out=1`
- Use `authedPage` fixture
- Click "Sign out" button (sidebar, `aria-label` or text "Sign out")
- Assert URL is `/?signed_out=1`
- Assert `[data-testid="signed-out-banner"]` is visible on landing page

### A5 — Expired token → redirected to `/`
- Call `seedExpiredToken(page)` + `setupMockDrive(page)`
- Navigate to `/dashboard`
- Assert redirected to `/` (auth guard catches expired token — `initAuth` clears it)

### A6 — OAuth callback success
- Intercept `/api/auth/token` → return `{ access_token: "tok", expires_in: 3600, scope: "...drive.appdata ...drive.file", token_type: "Bearer" }`
- Pre-seed `sessionStorage` keys `pkce_state=abc123` and `pkce_verifier=verifier123` via `addInitScript`
- Navigate to `/auth/callback?code=authcode&state=abc123`
- `handleRedirectCallback` fires, exchanges code → token → auth state becomes `"authenticated"`
- Assert URL becomes `/dashboard`

### A7 — OAuth callback failure
- Intercept `/api/auth/token` → return `{ error: "invalid_grant", error_description: "Token exchange failed" }` with status 400
- Pre-seed `pkce_state` + `pkce_verifier`
- Navigate to `/auth/callback?code=badcode&state=abc123`
- Assert URL returns to `/`
- Assert error message shown on landing page

---

## Key technical details

| Detail | Solution |
|---|---|
| `addInitScript` runs before React | Safe for sessionStorage seeding — `initAuth()` reads it on module load |
| `signIn()` does `window.location.href = ...` | Use `page.route(/accounts\.google\.com/, r => r.abort())` to block the navigation, then check the aborted request URL |
| Sign-out calls `fetch` to revoke token | Mock `https://oauth2.googleapis.com/revoke*` with 200 to avoid network errors |
| A6 needs PKCE state in sessionStorage before page load | Use `addInitScript` to set `pkce_state` and `pkce_verifier` before navigating to `/auth/callback` |
| Drive mock needed for A3/A4/A6 | `setupMockDrive` must be called before `page.goto` to intercept the `readManifest` Drive calls |

---

## Run command

```bash
npx playwright test e2e/auth.spec.ts --reporter=list
```
