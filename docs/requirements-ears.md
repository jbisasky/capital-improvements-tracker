# Requirements Specification (EARS)

**Status:** Draft v0.1 — derived from the [HLD](high-level-design.md), [LLD](low-level-design.md), and [UI/UX design](ui-ux-design.md)
**Author:** Devin (on behalf of @jbisasky)
**Last updated:** 2026-06-12
**Notation:** [EARS — Easy Approach to Requirements Syntax](https://alistairmavin.com/ears/)

> Each requirement uses one of the five EARS templates:
> - **Ubiquitous:** The [system] shall [requirement].
> - **Event-driven:** When [trigger], the [system] shall [response].
> - **State-driven:** While [state], the [system] shall [behavior].
> - **Unwanted behavior:** If [condition], then the [system] shall [response].
> - **Optional:** Where [feature is enabled], the [system] shall [behavior].

---

## Table of contents

1. [Architecture & infrastructure](#1-architecture--infrastructure)
2. [Authentication](#2-authentication)
3. [Data model & storage (Drive)](#3-data-model--storage-drive)
4. [Projects CRUD](#4-projects-crud)
5. [Attachments](#5-attachments)
6. [AI extraction](#6-ai-extraction)
7. [Tax model](#7-tax-model)
8. [Dashboard](#8-dashboard)
9. [Search & filter](#9-search--filter)
10. [Export](#10-export)
11. [Settings](#11-settings)
12. [Demo mode](#12-demo-mode)
13. [Error handling & resilience](#13-error-handling--resilience)
14. [Runaway-usage failsafes](#14-runaway-usage-failsafes)
15. [Security](#15-security)
16. [Responsive & mobile](#16-responsive--mobile)
17. [Accessibility](#17-accessibility)
18. [Testing & CI](#18-testing--ci)
19. [Hosting & deployment](#19-hosting--deployment)
20. [Longevity](#20-longevity)

---

## 1. Architecture & infrastructure

| ID | Type | Requirement |
| --- | --- | --- |
| ARCH-01 | Ubiquitous | The app shall be a 100% client-side single-page application with no first-party backend server. |
| ARCH-02 | Ubiquitous | The app shall use React Router v7 in SPA mode (`ssr: false`) and compile to static HTML/JS/CSS. |
| ARCH-03 | Ubiquitous | The app shall use Tailwind CSS v4 (Oxide engine) with CSS-first `@theme` configuration. |
| ARCH-04 | Ubiquitous | The app shall use shadcn/ui (Radix) components copied into the source tree, not installed as a dependency. |
| ARCH-05 | Ubiquitous | The app shall use TypeScript in strict mode (`strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) with a lint rule banning `any`. |
| ARCH-06 | Ubiquitous | The app shall use zod for runtime validation of all untrusted boundaries (Drive file contents, Gemini output). |
| ARCH-07 | Ubiquitous | The app shall use the native browser `fetch` API for all HTTP requests; no third-party HTTP client (e.g. Axios) shall be used. |
| ARCH-08 | Ubiquitous | The app shall centralize all HTTP concerns in a single typed `httpFetch` wrapper that handles auth header injection, timeout (`AbortController`, 30 s default), JSON serialization, and status-to-error mapping. |
| ARCH-09 | Ubiquitous | Service methods shall return a discriminated `Result<T>` type (`Ok<T> | Err<E>`) rather than throwing exceptions, so callers must handle failure explicitly. |
| ARCH-10 | Ubiquitous | The app shall separate code into layers: `services/` (I/O), `domain/` (pure logic, no I/O), `features/` (compose services + components), `components/` (presentational), and `lib/` (utilities). |
| ARCH-11 | Ubiquitous | All monetary values shall be stored and computed internally as integer cents to avoid floating-point drift; decimal dollars shall only appear at the I/O serialization boundary. |
| ARCH-12 | Ubiquitous | Timestamps shall be ISO-8601 UTC strings; date-only fields (e.g. `completionDate`) shall be `YYYY-MM-DD` local-date strings with no timezone. |

---

## 2. Authentication

| ID | Type | Requirement |
| --- | --- | --- |
| AUTH-01 | Ubiquitous | The app shall use Google Identity Services (GIS) token model for OAuth2 authentication. |
| AUTH-02 | Ubiquitous | The OAuth2 access token shall be held in memory only; it shall never be persisted to `localStorage`, cookies, or any storage medium. |
| AUTH-03 | Ubiquitous | The app shall request the scopes `drive.appdata` and `drive.file` during the OAuth consent flow. |
| AUTH-04 | Event-driven | When the user clicks "Sign in with Google," the app shall call `requestAccessToken` with `prompt: 'consent'` on first run and store the returned token in memory. |
| AUTH-05 | Event-driven | When the access token is within 60 seconds of expiry, the app shall perform a silent token refresh via `requestAccessToken({ prompt: '' })`. |
| AUTH-06 | Event-driven | When silent refresh succeeds, the app shall replace the in-memory token and continue without user interaction. |
| AUTH-07 | Event-driven | When silent refresh fails (e.g. `interaction_required`), the app shall transition to a `NeedsInteraction` state and display a non-blocking banner: "Session expired — sign in to continue." |
| AUTH-08 | State-driven | While in the `NeedsInteraction` state, the app shall preserve any in-flight form data in memory so it is not lost. |
| AUTH-09 | Event-driven | When an API call returns `401 Unauthorized`, the app shall attempt a single silent token refresh, replay the original request once, and surface `AUTH_REQUIRED` if the second attempt also fails. |
| AUTH-10 | Event-driven | When the user clicks "Sign out," the app shall call `google.accounts.oauth2.revoke()` (best-effort) and clear all in-memory auth state. |
| AUTH-11 | Event-driven | After every token response, the app shall verify that all required scopes are present; if any scope is missing, it shall surface `INSUFFICIENT_SCOPE` with a re-consent CTA. |
| AUTH-12 | Event-driven | When the app opens in a new tab or after a hard refresh, the app shall start in the unauthenticated state (no token recovery from storage). |

---

## 3. Data model & storage (Drive)

| ID | Type | Requirement |
| --- | --- | --- |
| DRV-01 | Ubiquitous | The app shall store its primary index (`manifest.json`) in the hidden `appDataFolder` of the user's Google Drive. |
| DRV-02 | Ubiquitous | The app shall store user-uploaded attachments in a user-visible Drive folder named "Capital Improvements (App Data)" created via the `drive.file` scope. |
| DRV-03 | Ubiquitous | The manifest shall conform to the `Manifest` zod schema (`schemaVersion`, `lastUpdated`, `summary`, `projects`). |
| DRV-04 | Event-driven | When the manifest is read from Drive, the app shall validate it with `Manifest.safeParse(zod)` and surface `READ_CORRUPT` if validation fails. |
| DRV-05 | Event-driven | When the manifest has a legacy schema shape, the app shall run forward-only migration functions to convert it to `schemaVersion: 1`. |
| DRV-06 | Ubiquitous | The app shall implement application-level compare-and-swap (CAS) for manifest writes by caching `headRevisionId` on read and re-reading it immediately before each write. |
| DRV-07 | Event-driven | When the pre-write `headRevisionId` does not match the cached value, the app shall fetch the remote manifest, attempt a 3-way merge by project `id`, and retry the CAS (up to 3 attempts). |
| DRV-08 | If-then | If a field-level conflict cannot be auto-resolved during merge, then the app shall surface a `CONFLICT` diff dialog to the user with options: "Keep mine / Keep theirs / Merge." |
| DRV-09 | Event-driven | Before each manifest write, the app shall copy the current remote content to a rotating backup (`manifest.bak.N.json`), keeping the most recent 5. |
| DRV-10 | If-then | If the backup write fails, then the app shall abort the manifest write (fail-safe: never overwrite the last known-good state) and report `UPLOAD_FAILED`. |
| DRV-11 | Event-driven | When no manifest is found on first run, the app shall create a new empty manifest in `appDataFolder` with `schemaVersion: 1` and an empty `projects` array. |
| DRV-12 | If-then | If more than one `manifest.json` is found in `appDataFolder`, then the app shall pick the most recently modified, log `MANIFEST_DUPLICATE`, and surface a one-time repair prompt. |
| DRV-13 | Ubiquitous | The `summary` object (`totalCostBasisAdded`, `totalDeductible`) shall always be recomputed from the `projects` array after any mutation; it shall never be merged directly. |
| DRV-14 | Event-driven | When a manifest read and all backups fail validation, the app shall surface `READ_CORRUPT` with an option to restore from backup or export raw data. |

---

## 4. Projects CRUD

| ID | Type | Requirement |
| --- | --- | --- |
| PRJ-01 | Event-driven | When the user submits the "Add improvement" form, the app shall assign a UUID `id`, `createdAt`, and `updatedAt`, build a `Project` object, and persist it to the manifest. |
| PRJ-02 | Ubiquitous | Each project shall include: `id`, `title` (required), `completionDate` (required), `totalCost` (required, non-negative), `taxTreatment`, `costBasisAdjustment`, `deductibleAmount`, `irsJustification`, `confidence`, `attachments`, `createdAt`, and `updatedAt`. |
| PRJ-03 | Event-driven | When the user edits a project and saves, the app shall update the project's `updatedAt` timestamp and persist the modified manifest via the CAS write protocol. |
| PRJ-04 | Event-driven | When the user requests deletion of a project, the app shall display a confirmation dialog before removing the project from the manifest. |
| PRJ-05 | Ubiquitous | The project form shall perform field-level validation mirroring the `Project` zod schema (e.g. non-empty title, valid date format, non-negative cost). |
| PRJ-06 | State-driven | While the save operation is in progress, the save button shall display a progress indicator and be disabled. |
| PRJ-07 | Ubiquitous | Mutations shall carry a client-generated `operationId` (UUID) to coalesce double-submits (e.g. double-click). |
| PRJ-08 | State-driven | While a budget or circuit guard is tripped (LLD §13), the save button shall be disabled with an inline reason message. |

---

## 5. Attachments

| ID | Type | Requirement |
| --- | --- | --- |
| ATT-01 | Ubiquitous | The app shall accept image files and PDFs as attachment uploads. |
| ATT-02 | Ubiquitous | The app shall use the Drive resumable upload protocol for attachments to handle flaky mobile networks. |
| ATT-03 | Event-driven | When an upload is interrupted, the app shall query the session URI to determine the last received byte and resume from that point. |
| ATT-04 | Event-driven | When the user cancels an upload, the app shall send `DELETE <session_uri>` to abort the upload session. |
| ATT-05 | Ubiquitous | A file shall only be referenced in the manifest after its upload returns a final `fileId`, so a failed upload never leaves a dangling reference. |
| ATT-06 | Ubiquitous | The save order shall be attachments-first, manifest-last, ensuring the manifest never references a `fileId` that doesn't exist. |
| ATT-07 | If-then | If an attachment upload succeeds but the subsequent manifest write fails, then the app shall record the orphaned Drive file in an in-memory "pending GC" list for cleanup on the next successful manifest load. |
| ATT-08 | Event-driven | When the user taps "view" on an attachment, the app shall open or display the file. When the user taps "download," the app shall trigger a download of the file from Drive. |
| ATT-09 | Event-driven | When the user taps "remove" on an attachment, the app shall remove the attachment reference from the project and update the manifest. |

---

## 6. AI extraction

| ID | Type | Requirement |
| --- | --- | --- |
| AI-01 | Event-driven | When the user uploads a file and clicks "Extract details with AI," the app shall send the document to Gemini via the GenAI SDK using the BYOK key and display a spinner. |
| AI-02 | Ubiquitous | The AI extraction request shall use `gemini-2.5-flash` with `temperature: 0` and `response_mime_type: "application/json"` with a `response_schema` matching `ExtractionResult`. |
| AI-03 | Event-driven | When the document size is ≤ 15 MiB, the app shall send it inline (base64); when larger, it shall use the Gemini File API (resumable upload → poll until ACTIVE → `generateContent`). |
| AI-04 | Event-driven | When extraction completes, the app shall validate the response with `ExtractionResult.safeParse(zod)` and present the Review screen with prefilled, editable fields and per-field confidence badges. |
| AI-05 | Ubiquitous | Every AI-extracted value shall be editable and must be confirmed by the user before being saved to the manifest (decision C8). No extracted dollar amount shall be persisted without explicit user confirmation. |
| AI-06 | Event-driven | When the user edits an extracted field on the review screen, the app shall clear that field's "✦ extracted" marker. |
| AI-07 | If-then | If `finishReason !== "STOP"` (e.g. `SAFETY`, `MAX_TOKENS`), then the app shall surface `EXTRACTION_INCOMPLETE`, fall back to manual entry, and display any available raw text. |
| AI-08 | If-then | If Gemini returns `400 API_KEY_INVALID`, then the app shall display "Check your AI Studio key in Settings" with a deep-link to the Settings screen. |
| AI-09 | If-then | If Gemini returns `429 RESOURCE_EXHAUSTED`, then the app shall apply backoff and display a "quota" message. |
| AI-10 | Ubiquitous | The BYOK key shall never be logged, displayed in plain text (except during entry), or included in error reports. |
| AI-11 | Event-driven | When the user clicks "Discard" on the review screen, the app shall discard all extracted data and return to the form without saving. |
| AI-12 | Event-driven | When the user clicks "Looks good → continue" on the review screen, the app shall transfer the confirmed values into the project form for final save. |

---

## 7. Tax model

| ID | Type | Requirement |
| --- | --- | --- |
| TAX-01 | Ubiquitous | Each project shall have a `taxTreatment` field with one of: `capital_improvement`, `repair`, `deductible`, `credit`, or `unknown`. |
| TAX-02 | Ubiquitous | The app shall track `costBasisAdjustment` and `deductibleAmount` as separate fields, not a single "deduction" amount. |
| TAX-03 | Event-driven | When the user selects `capital_improvement` as the treatment, the app shall emphasize the cost-basis adjustment field. When the user selects `credit` or `deductible`, it shall emphasize the deductible amount field. |
| TAX-04 | Ubiquitous | The app shall display a "Not tax advice — confirm treatment with a professional" disclaimer near every tax figure. |
| TAX-05 | Ubiquitous | The app shall provide inline educational `HoverCard` tooltips on "cost basis," "deductible," and "credit" to explain the differences. |
| TAX-06 | Ubiquitous | The dashboard shall display a persistent educational banner: "Deductible is rare for a primary home — most items raise cost basis. Learn more →" |

---

## 8. Dashboard

| ID | Type | Requirement |
| --- | --- | --- |
| DASH-01 | Ubiquitous | The dashboard shall display three summary cards: total cost basis added (this year), total deductible (this year), and project count (with unclassified badge). |
| DASH-02 | Ubiquitous | Summary card values shall be derived from the manifest `projects` array, not stored independently. |
| DASH-03 | Event-driven | When the user changes the tax year selector, the dashboard shall filter all summary values and the recent projects list to the selected year. |
| DASH-04 | Ubiquitous | The dashboard shall display a "Recent projects" section with the most recent projects, including title, date, cost, and treatment badge, with a "View all" link. |
| DASH-05 | State-driven | While projects are loading, the dashboard shall display skeleton cards and rows, not spinners. |
| DASH-06 | State-driven | While no projects exist (first run), the dashboard shall display an empty state with a one-card guide and an "Add your first improvement" CTA. |

---

## 9. Search & filter

| ID | Type | Requirement |
| --- | --- | --- |
| SRCH-01 | Event-driven | When the user types in the search input, the app shall filter projects by title and vendor text (case-insensitive substring match). |
| SRCH-02 | Event-driven | When the user selects a year filter, the app shall filter projects to those with `completionDate` in the selected year. |
| SRCH-03 | Event-driven | When the user selects a treatment filter, the app shall filter projects to those with the selected `taxTreatment` value. |
| SRCH-04 | State-driven | While filters produce zero results, the app shall display a friendly empty state with a "No projects match" message and a way to clear filters. |

---

## 10. Export

| ID | Type | Requirement |
| --- | --- | --- |
| EXP-01 | Event-driven | When the user selects a format (manifest.json, CSV, or PDF summary) and scope (all, year, or selected) and clicks "Download," the app shall generate and download the corresponding file. |
| EXP-02 | Ubiquitous | The export page shall display a note: "Attachments live in your Drive folder 'Capital Improvements (App Data)' and are not bundled here." |
| EXP-03 | Ubiquitous | The manifest.json export shall contain the full `Manifest` object as valid JSON. |
| EXP-04 | Ubiquitous | The CSV export shall include one row per project with all key fields (title, date, cost, treatment, cost-basis adjustment, deductible, justification). |

---

## 11. Settings

| ID | Type | Requirement |
| --- | --- | --- |
| SET-01 | Ubiquitous | The settings page shall display: account info (email, sign out), Drive connection status, BYOK key entry, usage limits, data actions, and appearance toggle. |
| SET-02 | Ubiquitous | The Gemini API key input shall mask the key (bullets/dots) after entry. |
| SET-03 | Event-driven | When the user clicks "Save" for the API key, the app shall store it in `localStorage` (unless session-only mode is checked). |
| SET-04 | Event-driven | When the user clicks "Test," the app shall send a trivial ping to Gemini and display the result (valid/invalid, model name). |
| SET-05 | Ubiquitous | The settings page shall display a warning: "Stored in this browser's localStorage. Anyone with access to this device could read it." |
| SET-06 | Event-driven | When the user checks "Session-only," the app shall hold the key in memory only and not persist it to `localStorage`. |
| SET-07 | Ubiquitous | The usage limits section shall display configurable caps: `maxAiCallsPerDay`, `maxAiTokensPerDay`, `maxAiCallsPerSession`, and current "Used today" count. |
| SET-08 | Ubiquitous | The appearance section shall provide three options: System, Light, Dark. The selection shall be persisted in `localStorage`. |

---

## 12. Demo mode

| ID | Type | Requirement |
| --- | --- | --- |
| DEMO-01 | Event-driven | When the user clicks "See a demo" on the landing page, the app shall navigate to `/demo/dashboard` without requiring authentication. |
| DEMO-02 | Ubiquitous | The demo environment shall use static fixture data (`DEMO_MANIFEST`) baked into the build, with 3–5 sample projects spanning different tax treatments. |
| DEMO-03 | State-driven | While in demo mode, the app shall display a persistent sticky banner: "Demo mode — exploring with sample data. [Sign in to use your own data →]." |
| DEMO-04 | State-driven | While in demo mode, the dashboard, project list, project detail, search, and filter features shall function normally against the fixture data (read-only). |
| DEMO-05 | If-then | If the user attempts a write action (create, edit, delete, save settings) in demo mode, then the app shall display a toast: "This is a demo — sign in to save your own data" and shall not modify the fixture data. |
| DEMO-06 | Event-driven | When the user clicks "Extract with AI" in demo mode, the app shall display a canned extraction result (pre-built fixture) rather than calling Gemini. |
| DEMO-07 | Event-driven | When the user clicks "Sign in" from the demo banner or "Sign out" in demo mode, the app shall navigate back to the landing page (`/`). |
| DEMO-08 | State-driven | While in demo mode, the export function shall download the demo fixture data as JSON/CSV. |
| DEMO-09 | State-driven | While in demo mode, the theme toggle shall work and persist its setting in `localStorage`. |
| DEMO-10 | Ubiquitous | The `DemoProvider` shall supply the same context shape as the real `AuthProvider` + `DriveProvider`, so existing UI components render identically regardless of the data source. |
| DEMO-11 | Ubiquitous | The demo fixture data (~2–5 KB) shall be tree-shaken from the authenticated code path to minimize bundle impact. |

---

## 13. Error handling & resilience

| ID | Type | Requirement |
| --- | --- | --- |
| ERR-01 | Ubiquitous | Every `AppError` shall carry `{ code, httpStatus?, cause?, operationId? }`; user-facing messages shall never leak tokens, keys, or raw payloads. |
| ERR-02 | If-then | If a network error or retryable HTTP status (`408`, `429`, `500`, `502`, `503`, `504`) occurs, then the app shall retry with exponential backoff (base 500 ms, factor 2, max 5 attempts, cap 8 s, full jitter), honoring `Retry-After` when present. |
| ERR-03 | Ubiquitous | The app shall never retry `400`, `403` (except rate-limit-shaped), `404`, `409` (conflict → domain resolution), or `412` (precondition → CAS path). |
| ERR-04 | If-then | If the zod parse of a manifest read fails and all backups also fail, then the app shall display: "Couldn't read your data — restore backup / export." |
| ERR-05 | State-driven | While data is loading, the app shall display skeleton cards/rows, not spinners. |
| ERR-06 | State-driven | While the network is offline, the app shall display "You're offline — viewing last synced data" and disable write operations. |
| ERR-07 | If-then | If a Drive upload fails, then the app shall display an inline retry affordance on the attachment. |
| ERR-08 | If-then | If `AUTH_REQUIRED` is raised mid-operation, then the app shall display a non-blocking banner "Session expired — sign in to continue" and preserve in-flight form data. |
| ERR-09 | If-then | If the user partially granted OAuth scopes (unchecked a box), then the app shall display `INSUFFICIENT_SCOPE` with a "Re-grant Drive access" CTA. |
| ERR-10 | If-then | If Drive returns a `403` storage quota error, then the app shall display "Your Google Drive is full." |
| ERR-11 | Ubiquitous | Every mutation success shall be communicated via a toast + state update, not a full page reload. |
| ERR-12 | Ubiquitous | The "Not tax advice" disclaimer shall be persistently visible and link to the `/about` page. |

---

## 14. Runaway-usage failsafes

| ID | Type | Requirement |
| --- | --- | --- |
| SAFE-01 | Ubiquitous | No raw `fetch` to a Google endpoint shall be allowed outside the guarded `httpFetch` pipeline (enforced by lint rule). |
| SAFE-02 | If-then | If the number of API calls for a single user gesture exceeds `K` (e.g. 8), then the app shall abort the gesture, log `LOOP_GUARD_TRIPPED`, and display "Something looped unexpectedly — action stopped." |
| SAFE-03 | If-then | If the global call frequency exceeds `N` calls within window `W` (e.g. 30 calls / 10 s), then the app shall open the global circuit breaker, halt all outbound calls, and display a fatal banner. |
| SAFE-04 | State-driven | While the global circuit breaker is open, it shall require the cooldown to elapse AND a manual user "Resume" click before closing (sticky behavior). |
| SAFE-05 | Ubiquitous | Each API endpoint (Drive, Gemini, File API) shall have its own token-bucket rate limiter (e.g. Gemini: capacity 5, refill 1/2 s; Drive: capacity 10, refill 2/s). |
| SAFE-06 | If-then | If an API endpoint accumulates `F` consecutive failures (e.g. 5), then the per-endpoint circuit breaker shall open for cooldown `C` (e.g. 30 s), then allow a single half-open probe. |
| SAFE-07 | Ubiquitous | The app shall track AI usage counters: session count (in-memory), rolling daily count (persisted in `localStorage` keyed by UTC date), for both request count and estimated tokens. |
| SAFE-08 | If-then | If the daily or session AI budget cap is reached, then the app shall block further AI calls with `AI_BUDGET_EXCEEDED` and display "Daily AI limit reached — raise limit or try tomorrow" with an explicit override action. |
| SAFE-09 | Event-driven | When a component unmounts or the route changes, the app shall cancel in-flight requests via `AbortController` to prevent zombie loops. |
| SAFE-10 | Ubiquitous | Every guard trip (`LOOP_GUARD_TRIPPED`, `CIRCUIT_OPEN`, `AI_BUDGET_EXCEEDED`, `RATE_LIMITED_LOCAL`) shall be recorded to the in-app diagnostics log (ring buffer) with timestamp, label, and counters. |

---

## 15. Security

| ID | Type | Requirement |
| --- | --- | --- |
| SEC-01 | Ubiquitous | The access token shall be held in memory only; it shall be injected as `Authorization: Bearer` per request and never persisted, logged, or placed in URLs. |
| SEC-02 | Ubiquitous | The BYOK key shall be sent only as the `?key=` query parameter to `generativelanguage.googleapis.com` over HTTPS and shall be redacted from all logs/telemetry. |
| SEC-03 | Ubiquitous | The app shall serve a strict Content Security Policy (CSP) via Cloudflare Pages `_headers`: `default-src 'self'`; `connect-src` limited to Google API endpoints; `script-src 'self'` + GIS client; `object-src 'none'`; `base-uri 'self'`; plus HSTS and `X-Content-Type-Options: nosniff`. |
| SEC-04 | Ubiquitous | The app shall include no third-party scripts beyond Google Identity Services. |
| SEC-05 | Ubiquitous | OAuth scope shall be minimized: `drive.file` (not full `drive`) so the app can only access files it created. |
| SEC-06 | Where-optional | Where the user enables "session-only" mode, the BYOK key shall be held in memory only and not persisted to `localStorage`. |

---

## 16. Responsive & mobile

| ID | Type | Requirement |
| --- | --- | --- |
| MOB-01 | Ubiquitous | The app shall follow a mobile-first design approach with breakpoints: mobile (< 640 px), tablet (≥ 768 px), desktop (≥ 1024 px). |
| MOB-02 | State-driven | While the viewport is mobile-width, the app shall display a bottom tab bar (Dash, Proj, center Add (+), Exp, Settings) instead of the desktop left rail. |
| MOB-03 | Ubiquitous | The file input for attachments shall use `accept="image/*,application/pdf"` and `capture="environment"` on mobile so "Scan / take photo" opens the rear camera directly. |
| MOB-04 | Ubiquitous | All touch targets shall be ≥ 44 px; primary actions shall be thumb-reachable (bottom of viewport). |
| MOB-05 | State-driven | While the viewport is mobile-width, data tables shall degrade to stacked card rows; long numbers shall be right-aligned and never truncated silently. |

---

## 17. Accessibility

| ID | Type | Requirement |
| --- | --- | --- |
| A11Y-01 | Ubiquitous | The app shall meet WCAG 2.1 AA: color contrast ≥ 4.5:1 and visible focus rings (provided by Radix). |
| A11Y-02 | Ubiquitous | The app shall be fully keyboard operable: tab order, `Esc` closes dialogs, `Enter` submits forms. |
| A11Y-03 | Ubiquitous | All inputs shall have semantic labels; currency fields shall announce currency. Confidence shall be conveyed by text + icon, not color alone. |
| A11Y-04 | Ubiquitous | Async results (sync status, save success/failure) shall use ARIA live regions so screen readers announce them. |
| A11Y-05 | Ubiquitous | The app shall respect `prefers-reduced-motion` (skeleton/transition animations) and `prefers-color-scheme`. |

---

## 18. Testing & CI

| ID | Type | Requirement |
| --- | --- | --- |
| TEST-01 | Ubiquitous | The app shall use Vitest for unit and component tests, colocated as `*.test.ts` / `*.test.tsx` next to the source files. |
| TEST-02 | Ubiquitous | The app shall use Playwright for end-to-end tests in a top-level `e2e/` directory with `*.spec.ts` naming. |
| TEST-03 | Ubiquitous | Vitest shall share the Vite config (`vite.config.ts`) so path aliases, TypeScript transforms, and plugins work without extra setup. |
| TEST-04 | Ubiquitous | E2E tests shall mock all external API calls (Google OAuth, Drive, Gemini) via Playwright's `page.route()` for deterministic, credential-free CI runs. |
| TEST-05 | Ubiquitous | The GitHub Actions CI workflow shall run three parallel jobs on every push and PR: lint/typecheck, Vitest (with coverage), and Playwright E2E. |
| TEST-06 | Ubiquitous | PR merge shall require all three CI jobs to pass (branch protection rule). |
| TEST-07 | Ubiquitous | The Playwright config shall use `webServer` to automatically start the Vite dev server on port 5173. |
| TEST-08 | Event-driven | When any CI job fails, the workflow shall upload artifacts (coverage report for Vitest, HTML report + screenshots/traces for Playwright). |

---

## 19. Hosting & deployment

| ID | Type | Requirement |
| --- | --- | --- |
| HOST-01 | Ubiquitous | The app shall be deployed to Cloudflare Pages as a static site, with the GitHub repo as the source of truth. |
| HOST-02 | Ubiquitous | Cloudflare Pages shall serve a `_headers` file with the strict CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, and frame-ancestors lockdown. |
| HOST-03 | Ubiquitous | The deployment shall use SPA routing: serve `index.html` for all unmatched client routes. |
| HOST-04 | Ubiquitous | Both the `*.pages.dev` URL and any custom domain shall be registered as Authorized JavaScript origins in the Google Cloud OAuth client config. |
| HOST-05 | Ubiquitous | The hosting shall be treated as swappable infrastructure: the build output is static files, and user data lives in Drive, so migrating to another static host requires no data migration. |

---

## 20. Longevity

| ID | Type | Requirement |
| --- | --- | --- |
| LONG-01 | Ubiquitous | The app shall pin and vendor dependencies; the lockfile shall be committed. |
| LONG-02 | Ubiquitous | The app shall prefer shadcn (owned, copied-in code) over heavy external UI library dependencies. |
| LONG-03 | Ubiquitous | The app shall minimize runtime dependencies; it shall avoid services that can disappear (other than Google core). |
| LONG-04 | Ubiquitous | The Google Cloud project and OAuth client configuration shall be documented in `docs/google-cloud-setup.md` so it can be recreated. |
| LONG-05 | Ubiquitous | The app shall provide data export (manifest.json + CSV/PDF) so data is never trapped in the app. |

---

*Derived from the HLD, LLD, and UI/UX design documents. Requirements will be refined as
implementation proceeds and edge cases are discovered.*
