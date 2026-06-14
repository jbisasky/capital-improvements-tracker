# Instructions for AI Agents

Welcome! This is a 100% serverless, client-side SPA for tracking capital improvement projects and tax cost-basis adjustments. It uses React Router v7, TypeScript, Tailwind v4, shadcn/ui, and Vite.

## Project Context
- **No backend.** All storage is in the user's personal Google Drive via the Drive API (`drive.file` and `drive.appdata` scopes).
- **AI Extraction.** Uses Gemini 2.5 Flash via a BYOK (Bring Your Own Key) model for receipt scanning and data extraction.
- **Strict Types.** The project uses strict TypeScript and ESLint rules. Do not use `any`.
- **Domain logic.** IRS rules and document completeness logic reside in `src/domain/`.
- **Services.** Auth (`auth.ts`), HTTP (`http.ts`), Storage (`drive-storage-driver.ts`, `mock-storage-driver.ts`), Analytics (`analytics.ts`), and Telemetry (`telemetry.ts`) reside in `src/services/`.

## Completed Steps
* Task 1 (PR #5): Scaffold — React Router 7 SPA with Tailwind v4 + shadcn/ui, routing, sidebar, mobile nav.
* Task 2 (PR #9): Domain types + storage — Result<T> pattern, Zod manifest schemas, StorageDriver interface, MockStorageDriver with 8 fixture projects.
* Task 3 (PR #10): Core views — Dashboard, Projects list/detail/CRUD, Settings, Export, wired to MockStorageDriver. Added Plausible analytics and OTel/Honeycomb observability.
* Task 4 (PR #16): Auth + Drive — GIS OAuth2 sign-in, auth state machine, httpFetch wrapper with retry/backoff, DriveStorageDriver with CAS via headRevisionId, auth-guarded routing, sign-out in sidebar, trackSignIn() analytics event.
* Task 5: (PR #17) AI extraction — Gemini 2.5 Flash integration, BYOK API key, receipt scanning, human review step.

## Remaining Steps
* Task 6: Polish — PWA/offline, diagnostics page, landing page refinement.

## Important Directives
When you complete a task or a step, **you MUST update the "Completed Steps" and "Remaining Steps" sections in this `AGENTS.md` file AND in the `README.md` file (if applicable)** to mark what was accomplished.

Always refer to the design docs in `docs/` (`high-level-design.md`, `low-level-design.md`, `requirements-ears.md`, `ui-ux-design.md`) when implementing new features.
