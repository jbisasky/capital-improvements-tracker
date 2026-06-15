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
4. **Report:** Generate a Markdown test report (in the `docs/test-reports/` folder) documenting the test evidence, including screenshots of the passing flows. Reference the format in `docs/test-reports/task4-auth-drive.md` (or similar) as an example.

## 🔄 Task Tracking Directives
When you complete a task or a step, **you MUST update the "Completed Tasks" and "Remaining Tasks" sections in this `AGENTS.md` file AND in the `README.md` file (if applicable)**.

### Completed Tasks
- [x] **Task 1 (PR #5):** Scaffold — React Router 7 SPA with Tailwind v4 + shadcn/ui, routing, sidebar, mobile nav.
- [x] **Task 2 (PR #9):** Domain types + storage — Result<T> pattern, Zod manifest schemas, StorageDriver interface, MockStorageDriver with 8 fixture projects.
- [x] **Task 3 (PR #10):** Core views — Dashboard, Projects list/detail/CRUD, Settings, Export, wired to MockStorageDriver. Added Plausible analytics and OTel/Honeycomb observability.
- [x] **Task 4 (PR #16):** Auth + Drive — GIS OAuth2 sign-in, auth state machine, httpFetch wrapper with retry/backoff, DriveStorageDriver with CAS via headRevisionId, auth-guarded routing, sign-out in sidebar, trackSignIn() analytics event.
- [x] **Task 5 (PR #17):** AI extraction — Gemini 2.5 Flash integration, BYOK API key, receipt scanning, human review step.
- [x] **Task 6:** Polish — Diagnostics page, ring buffer logging.
- [x] **Task 7 (PR #26):** Polish — Landing page two-column marketing layout, GoogleIcon component, about page link fixes + EARS doc link, Playwright E2E tests.

### Remaining Tasks
- [ ] **Task 8:** Polish — PWA/offline & service worker.
