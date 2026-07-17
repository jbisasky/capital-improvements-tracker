# Instructions for AI Agents

Welcome! This is a 100% serverless, client-side SPA for tracking capital improvement projects and tax cost-basis adjustments. It uses React Router v7, TypeScript, Tailwind v4, shadcn/ui, and Vite.

## 🚨 Critical Operational Constraints
- **Zero Backend:** There is NO first-party server. All storage goes directly to the user's personal Google Drive via the Drive API (`drive.file` and `drive.appdata` scopes).
- **Strict Types:** The project uses strict TypeScript and ESLint rules. **Do not use `any`.**
- **AI Extraction:** Uses Gemini 2.5 Flash via a BYOK (Bring Your Own Key) model for receipt scanning.
- **Reference Docs:** Always refer to the design docs in `docs/` (`high-level-design.md`, `low-level-design.md`, `requirements-ears.md`, `ui-ux-design.md`) when implementing new features. They contain the source of truth for architecture and state handling.

## 📁 Architecture Overview
- **`src/domain/`**: Pure domain logic, IRS rules, and document completeness logic. Zod manifest schemas.
- **`src/services/`**: The I/O layer. Contains Auth (`auth.ts`), HTTP (`http.ts`), Storage (`drive-storage-driver.ts`, `mock-storage-driver.ts`), Analytics (`analytics.ts`), and Telemetry (`telemetry.ts`).
- **`src/app/`**: Route pages (landing, dashboard, projects, settings, export).

## 🛠️ Refactoring & Code Modifications
- **Prioritize Refactoring:** Before creating new functions, files, or utilities, look for existing code that can be reused or refactored. The goal is to keep the codebase compact and maintainable. Erring towards refactoring existing code rather than just bolting on new code is highly encouraged.

## ✅ Pre-commit & Testing Rules
If you make any code changes (not just documentation updates), you must:
1. **Write Tests:** Practice Test-Driven Development (TDD) when possible. **You must write unit tests (UTs) for all new code.**
   - **F.I.R.S.T. Principles:** Ensure tests are **F**ast, **I**solated, **R**epeatable, **S**elf-validating, and **T**horough/Timely.
   - **AAA Pattern:** Structure your tests using the **A**rrange, **A**ct, **A**ssert pattern. Use inline comments (`// Arrange`, `// Act`, `// Assert`) if helpful.
   - **Avoid Flakiness:** Do not rely on external network calls or brittle DOM structures. Mock where appropriate.
2. **Run Tests:** Run the relevant Vitest unit/component tests to ensure they pass.
3. **E2E Testing:** Run a suite of Playwright E2E tests covering the affected flows.
4. **Report:** Generate a Markdown test report (in the `docs/test-reports/` folder) documenting the test evidence, including screenshots of the passing flows. Reference the format in `docs/test-reports/task4-auth-drive.md` (or similar) as an example. **Compress every screenshot** per [Documentation images](#documentation-images) before committing.

## Documentation images

Every raster image under `docs/` (PNG, JPEG, WebP) — including `docs/screenshots/`, `docs/test-reports/**`, and `docs/mockups/` — must be **≤200 kB (204,800 bytes)** after optimization.

When creating or updating doc images:

1. Capture or export the image.
2. Run `npm run compress:doc-images` (or `npm run compress:doc-images -- --check` to verify only).
3. Confirm nothing exceeds the limit:

   ```bash
   find docs -type f \( -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' -o -name '*.webp' \) -size +200k
   ```

   (should produce no output)

**Playwright captures:** use JPEG (`type: 'jpeg'`, `quality: 80`), viewport-only (`fullPage: false`) unless a full-page capture is required. See `e2e/helpers/doc-screenshot.ts`. Do **not** commit raw lossless PNGs to `docs/` without running the compress script.

If a screenshot cannot reach 200 kB without unacceptable blur, crop to the relevant UI region or reduce viewport width — do not raise the limit without user approval.

## 🔄 Task Tracking Directives
When you complete a task or a step, **you MUST update the "Completed Tasks" and "Remaining Tasks" sections in this `AGENTS.md` file AND in the `README.md` file (if applicable)**.

### Completed Tasks
- [x] **Task 1 (PR #5):** Scaffold — React Router 7 SPA with Tailwind v4 + shadcn/ui, routing, sidebar, mobile nav.
- [x] **Task 2 (PR #9):** Domain types + storage — Result<T> pattern, Zod manifest schemas, StorageDriver interface, MockStorageDriver with 8 fixture projects.
- [x] **Task 3 (PR #10):** Core views — Dashboard, Projects list/detail/CRUD, Settings, Export, wired to MockStorageDriver. Added Plausible analytics and OTel/Honeycomb observability.
- [x] **Task 4 (PR #16):** Auth + Drive — GIS OAuth2 sign-in, auth state machine, httpFetch wrapper with retry/backoff, DriveStorageDriver with CAS via headRevisionId, auth-guarded routing, sign-out in sidebar, trackSignIn() analytics event.
- [x] **Task 5 (PR #17):** AI extraction — Gemini 2.5 Flash integration, BYOK API key, receipt scanning, human review step.
- [x] **Task 6:** Polish — Diagnostics page, ring buffer logging.
- [x] **Task 7 (PR #25):** Polish — Landing page & about page refinement.

### Remaining Tasks
- [x] **Task 8:** Polish — PWA/offline & service worker.

### Polish
- [x] **PDF Export + Scope Selector:** Added `@react-pdf/renderer`-based PDF export (`src/app/export/pdf-document.tsx`) with cover/summary page, per-project detail cards, IRS justification, documentation status badges, and "not tax advice" disclaimer. Updated Export page to use radio-group format selector (PDF default, CSV, JSON) and scope selector (All projects / By tax year with year picker). 251/251 unit tests pass + 13/13 E2E tests pass. See `docs/test-reports/pdf-export.md`.

### Bug Fixes
- [x] **Save Property fix:** Implemented `saveProperty` end-to-end (schema → StorageDriver interface → MockStorageDriver → DriveStorageDriver → StorageContext). Fixed Settings page to wire the handler, sync form state from late-loading manifest via `useEffect`, add optional `address2` field, add required-field validation with inline error, and show Saving…/Saved ✓/error button states. 194/194 tests pass.
- [x] **Dashboard sync skeleton fix:** Stopped demo mode from polluting IndexedDB offline cache (`persistOfflineCache={false}`), deferred manifest display until Drive confirms (skeleton during sync), clear cache on sign-out. 305/305 unit tests + 8/8 dashboard E2E pass. See `docs/test-reports/dashboard-sync-skeleton.md`.
- [x] **PR #53 review fixes:** Fixed year-scoped export after loading, offline cached startup, Safe Harbor tooltip markup, AlertDialog focus management, and auth token restoration for local/E2E runs. Focused Vitest 39/39, check pass, 35/35 affected Chromium E2E pass. See `docs/test-reports/pr53-review-fixes.md`.
- [x] **Semantic HTML landmark fix:** Closed mismatched `</div>` on project-detail Documentation Health `<section>` (Vite parse break), and labelled dual `aside` landmarks (`Main navigation` / `Documentation status`) so axe `landmark-unique` passes. 109/109 chromium E2E pass. See `docs/test-reports/html-context-landmarks.md`.

### Polish
- [x] **Dark/Light/System theme:** Added `src/services/theme.ts` + `theme-context.tsx` (`ThemeProvider`/`useTheme`), persisted to `localStorage` (`theme_preference`) — a device-local preference, kept out of `manifest.json` to match the BYOK key/AI budget pattern. Settings page "Appearance" section (Light/Dark/System radiogroup) + sidebar/mobile-top-bar quick-cycle icon toggle. Inline `index.html` script prevents theme flash on load. 218/218 tests pass. See `docs/test-reports/dark-light-mode.md`.
- [x] **Harden a11y follow-ups:** Lazy-route axe h1 waits (projects/settings), AttachmentSection h3→h2, desktop+mobile auth/landing E2E, AppShell flex main for centered page loader, PR CI full Playwright suite (smoke still main-only), `.cursor/` gitignored. 50/50 targeted chromium E2E + check pass. See `docs/test-reports/harden-a11y-follow-ups.md`.

### Hosting (Cloudflare Pages)
- [x] `public/_headers` — CSP, HSTS, security headers (EARS HOST-02, SEC-03).
- [x] `public/_redirects` — SPA fallback (`/* → /index.html 200`).
- [x] `VITE_PLAUSIBLE_DOMAIN` — build-time Plausible script injection via Vite.
- [x] **Production:** https://capital-improvements-tracker.pages.dev — SEO/OG meta via `VITE_SITE_URL`, `public/og-image.jpg`.
