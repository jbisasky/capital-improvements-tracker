# E2E Auth + Mock Drive Setup — Full Scenario Plan

Establish Playwright infrastructure for mocking Google sign-in and Drive storage, then cover every major user flow including error and failure scenarios.

---

## Infrastructure

### How auth + storage are mocked

| Concern | Approach |
|---|---|
| **Auth** | Seed `sessionStorage` (`auth_access_token` + `auth_expires_at`) via Playwright `storageState` before page load — `initAuth()` restores the fake token, auth state becomes `"authenticated"` immediately |
| **Drive API** | `page.route("**/googleapis.com/drive/**")` returns shaped JSON fixtures; `page.route("**/googleapis.com/upload/**")` echoes back success |
| **Token endpoint** | `page.route("/api/auth/token")` — not needed for most tests (token is pre-seeded), but intercepted for sign-in flow tests |
| **Gemini API** | `page.route("**/generativelanguage.googleapis.com/**")` returns a canned `ExtractionResponse` or an error body |
| **No code changes** | Zero production code changes required — all interception is Playwright-side |

### Files to create

```
e2e/
  fixtures/
    auth-state.ts      ← storageState helper (fake token, far-future expiry)
    mock-drive.ts      ← page.route() helpers for Drive CRUD + manifest fixture
    mock-gemini.ts     ← page.route() helper for Gemini extraction + key-test endpoints
    index.ts           ← extended `test` object with authedPage fixture
  auth.spec.ts         ← sign-in, sign-out, auth guard scenarios
  dashboard.spec.ts    ← dashboard with mocked Drive data
  projects.spec.ts     ← projects list, detail, add, edit, delete
  settings.spec.ts     ← property form validation, BYOK key flow
  ai-extraction.spec.ts ← extract-with-AI happy path + failure scenarios
playwright.config.ts   ← (no changes)
```

---

## Scenario List

### `auth.spec.ts` — Authentication

| # | Scenario | Flow | Expected |
|---|---|---|---|
| A1 | **Sign-in redirects to Google** | Click "Sign in with Google" on landing | `window.location.href` changes toward `accounts.google.com` (intercept navigation) |
| A2 | **Auth guard — unauthenticated user redirected** | Navigate to `/dashboard` without sessionStorage token | Redirected to `/` |
| A3 | **Auth guard — authenticated user lands on dashboard** | Seed token, navigate to `/dashboard` | Dashboard renders |
| A4 | **Sign-out clears session and returns to `/`** | Authenticated → click sign-out in sidebar | Redirected to `/?signed_out=1`, landing shows sign-in button |
| A5 | **Token expiry shows needs_interaction** | Seed an already-expired token, navigate to `/dashboard` | Redirected to `/` |
| A6 | **OAuth callback — token exchange success** (intercept `/api/auth/token`) | Navigate to `/auth/callback?code=abc&state=s` with matching sessionStorage state | `handleRedirectCallback` fires, auth becomes `"authenticated"`, redirected to `/dashboard` |
| A7 | **OAuth callback — token exchange failure** | `/api/auth/token` returns 400 | Redirected back to `/`, error shown |

---

### `dashboard.spec.ts` — Dashboard (authenticated + mocked Drive)

| # | Scenario | Expected |
|---|---|---|
| D1 | **Dashboard loads fixture projects** | Summary card shows total cost-basis from fixture manifest |
| D2 | **Project count badge** | Correct count in "Projects" sidebar link |
| D3 | **Drive read error** | Route returns 500 → error banner shown, retry button visible |
| D4 | **Empty state (no projects)** | Fixture manifest with 0 projects → empty state illustration shown |

---

### `projects.spec.ts` — Projects CRUD

| # | Scenario | Expected |
|---|---|---|
| P1 | **Projects list renders** | All fixture projects listed with title + cost |
| P2 | **Project detail page loads** | Navigate to `/projects/:id`, detail fields shown |
| P3 | **Add project manually (happy path)** | Fill form → submit → project appears in list |
| P4 | **Add project — required field missing** | Submit without title → inline validation error, no navigation |
| P5 | **Edit project** | Change title → save → updated title shown in list |
| P6 | **Delete project** | Click delete → confirm → project removed from list |
| P7 | **Drive write conflict (CAS failure)** | Mock write returns `DRIVE_CONFLICT` → error toast/banner shown |
| P8 | **Offline — write blocked** | Simulate offline via `page.context().setOffline(true)` → "You are offline" banner, save button disabled |

---

### `settings.spec.ts` — Settings

| # | Scenario | Expected |
|---|---|---|
| S1 | **Property form pre-fills from manifest** | Fields show address/city/state/zip from fixture property |
| S2 | **Save property — happy path** | Fill valid address → submit → "Saved ✓" button state |
| S3 | **Save property — blank address rejected** | Clear address → submit → inline "Please enter your street address." error, `saveProperty` not called |
| S4 | **Save property — invalid address (no number)** | Enter "NoNumbers" → "Include a house number and street name" error |
| S5 | **Save property — blank city rejected** | Clear city → inline "Please enter your city." error |
| S6 | **Save property — state not selected** | Clear state → "Please select a state." error |
| S7 | **Save property — Drive error on write** | Mock `saveProperty` to return `DRIVE_CONFLICT` → "Couldn't save your property" error shown |
| S8 | **BYOK key save + test — valid key** | Enter key → click "Test key" → intercept Gemini ping with 200 → "Valid" status shown |
| S9 | **BYOK key save + test — invalid key** | Gemini ping returns 400 → "Invalid or restricted" status shown |
| S10 | **BYOK key remove** | Key present → click Remove → key cleared, input re-shown |
| S11 | **Sign-out from settings** | Click sign-out → redirected to `/?signed_out=1` |

---

### `ai-extraction.spec.ts` — AI Extraction

The Gemini call (`**/generativelanguage.googleapis.com/**`) is intercepted by `mock-gemini.ts`.

| # | Scenario | Expected |
|---|---|---|
| E1 | **Happy path — extract + review + accept** | Upload a fake PDF → "Extract details with AI" → intercept returns valid `ExtractionResponse` → review step shows extracted fields → click Accept → form pre-filled |
| E2 | **Review step — user edits a field before accepting** | Modify the title in review → Accept → form title matches edited value |
| E3 | **Discard extraction — returns to upload step** | Click Discard in review → upload step shown, form not pre-filled |
| E4 | **No Gemini key configured** | Ensure key absent from localStorage → "Extract" button disabled or missing (key prompt shown) |
| E5 | **Gemini API error (network failure)** | Intercept aborts → error message shown in upload step, user can still fill manually |
| E6 | **Gemini returns invalid key (400)** | Intercept returns `{"error":{"message":"API key not valid"}}` → "Invalid API key. Check your Gemini key in Settings." error |
| E7 | **Gemini returns non-receipt (confidence=0)** | Intercept returns zero-confidence result → "doesn't appear to be a receipt" error |
| E8 | **File too large (>15 MB)** | Set file size > 15 MB → error shown before API call, no network request made |
| E9 | **Skip to manual** | Click "Enter details manually" → form shown without pre-fill |
| E10 | **Multi-file extraction** | Upload 2 files → both included → single intercept call → review shown with synthesized result |

---

### `theme.spec.ts` — Light / Dark / System Theme

Theme preference is persisted to `localStorage` under key `theme_preference`. The sidebar has a cycle button; Settings has a 3-option radio group.

| # | Scenario | Viewport | Expected |
|---|---|---|---|
| T1 | **Defaults to system — no localStorage entry** | desktop | `<html>` class matches OS preference (test with `prefers-color-scheme: dark` media emulation) |
| T2 | **Cycle button: system → light → dark → system** | desktop | Click sidebar cycle button 3×; each click updates `localStorage` and toggles `<html class="dark">` accordingly |
| T3 | **Setting persists across page reload** | desktop | Set dark via cycle → reload → `<html>` still has `class="dark"`, sidebar icon shows Moon |
| T4 | **Settings page radio group — select Light** | desktop | Open Settings → click Light radio → `localStorage.theme_preference === "light"`, `<html>` loses `dark` class |
| T5 | **Settings page radio group — select Dark** | desktop | Click Dark radio → `localStorage.theme_preference === "dark"`, `<html>` has `dark` class |
| T6 | **Settings page radio group — select System** | desktop | Click System radio → `localStorage.theme_preference === "system"` |
| T7 | **Mobile top-bar cycle button works** | mobile (390×844) | Tap theme icon in `[data-testid="mobile-top-bar"]` → localStorage updated, class toggled |
| T8 | **Theme preference is device-local (not in manifest)** | desktop | Change theme → inspect Drive write intercept → no Drive API call is made |

---

### `demo.spec.ts` — Demo Smoke + Exit

| # | Scenario | Viewport | Expected |
|---|---|---|---|
| DM1 | **Demo banner is visible** | desktop | Navigate to `/demo/dashboard` → amber "Viewing read-only demo data." banner visible |
| DM2 | **Demo loads fixture data** | desktop | Dashboard summary shows non-zero totals from fixture manifest |
| DM3 | **Exit Demo (mobile link) navigates to `/`** | mobile (390×844) | "Exit Demo" link (`.md:hidden`) is visible and navigates to landing page |
| DM4 | **Exit Demo & Connect Drive (desktop link) navigates to `/`** | desktop (1280×800) | "Exit Demo & Connect Drive" button visible in banner → click → landing page |
| DM5 | **Demo projects list loads** | desktop | `/demo/projects` renders project titles |
| DM6 | **Demo project detail loads** | desktop | Click a project → detail page renders without auth redirect |
| DM7 | **Demo export page loads** | desktop | `/demo/export` renders export heading and format options |
| DM8 | **Demo is read-only — no Drive calls** | desktop | Intercept `**/googleapis.com/**` → assert zero requests during demo session |

---

### Viewport Strategy — Mobile + Desktop

Rather than duplicating every spec, apply mobile viewports selectively where the UI diverges meaningfully:

| Spec | Mobile scenario IDs | Desktop scenario IDs |
|---|---|---|
| `auth.spec.ts` | A2 (auth guard redirect) | A1, A3–A7 |
| `dashboard.spec.ts` | D1 (mobile top-bar visible, sidebar hidden) | D1–D4 |
| `projects.spec.ts` | P1, P3 (mobile nav links) | P1–P8 |
| `settings.spec.ts` | S2, S3 (form layout) | S1–S11 |
| `ai-extraction.spec.ts` | E1 (upload + review flow) | E1–E10 |
| `theme.spec.ts` | T7 (mobile cycle button) | T1–T6, T8 |
| `demo.spec.ts` | DM3 (mobile exit link) | DM1–DM8 |

Use Playwright `test.use({ viewport: { width: 390, height: 844 } })` within a `test.describe` block for mobile variants. Mobile-specific assertions: sidebar is hidden (`.md:hidden` present on sidebar, absent on mobile top-bar), mobile nav links present in `<nav>`, demo banner exit link is `.md:hidden` version.

---

### Updated file list

```
e2e/
  fixtures/
    auth-state.ts
    mock-drive.ts
    mock-gemini.ts
    index.ts
  auth.spec.ts
  dashboard.spec.ts
  projects.spec.ts
  settings.spec.ts
  ai-extraction.spec.ts
  theme.spec.ts          ← NEW
  demo.spec.ts           ← NEW
playwright.config.ts     ← (no changes)
```

---

## Notes

- **`/demo/*` routes** already use `MockStorageDriver` — reuse them for pure UI tests that don't need auth.
- **`mock-drive.ts`** should expose `setupMockDrive(page, manifest?)` so individual tests can inject custom manifests (e.g. empty, with conflicts).
- **`mock-gemini.ts`** should expose `setupMockGemini(page, result?)` where `result` can be a success payload or an error spec.
- All auth-required specs use the extended `test` from `e2e/fixtures/index.ts` which seeds sessionStorage + mock Drive before each test.
- **Theme tests** need `page.emulateMedia({ colorScheme: "dark" })` to control the OS-level `prefers-color-scheme` media query.
- **Demo exit tests** don't need auth or Drive intercepts — navigate directly to `/demo/*`.
