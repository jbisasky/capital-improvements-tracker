# High-Level Design (HLD): Serverless Capital Improvements & Tax Deduction Tracker

**Status:** v1.0 — decisions locked, ready to build
**Author:** Devin (on behalf of @jbisasky)
**Last updated:** 2026-06-12

> This document captures the architecture and design *intent* before any code is written.
> All previously open questions have been resolved with the owner; see the **Decisions Log**
> in §13. Implementation should follow the choices recorded here.

---

## 1. Objective & Scope

Build a production-grade, **100% serverless, client-side SPA** that:

1. Lets a homeowner record capital improvement projects (title, date, cost, attachments).
2. Uses an AI multimodal model to **extract structured fields** from uploaded receipts/invoices.
3. Tracks the **tax impact** of each project (cost-basis adjustment and/or deductible amount).
4. Persists everything to the user's **personal Google Drive**, with no central server.
5. Is built to remain operable for ~**20 years** with minimal maintenance and no hosting bill.

### Out of scope (v1)
- Multi-user collaboration / sharing.
- Filing taxes or integrating with tax software.
- Authoritative tax advice — the app records and assists, it does not replace a CPA.

---

## 2. Architecture Overview

```mermaid
flowchart TB
    subgraph Browser["Browser (SPA) — React Router v7 (SPA mode) · Tailwind v4 · shadcn/ui"]
        direction TB
        subgraph UI["UI / State layer"]
            direction LR
            Auth["Auth (GIS OAuth2)"]
            Domain["Domain / State<br/>(projects, manifest)"]
            Settings["Settings (BYOK)<br/>Gemini API key in localStorage"]
        end
        subgraph Services["Services layer"]
            direction LR
            TokenClient["GIS token client"]
            DriveSvc["Drive Service<br/>(REST v3)"]
            GeminiSvc["Gemini Service<br/>(GenAI SDK)"]
        end
        Auth --> TokenClient
        Domain --> DriveSvc
        Settings --> GeminiSvc
    end

    TokenClient -- "OAuth consent / token" --> GAuth["accounts.google.com"]
    DriveSvc -- "access token · manifest + files" --> GDrive["googleapis.com/drive<br/>(appDataFolder + visible folder)"]
    GeminiSvc -- "API key" --> GGemini["generativelanguage.googleapis.com<br/>(gemini-2.5-flash)"]

    classDef google fill:#e8f0fe,stroke:#4285f4,color:#1a237e;
    class GAuth,GDrive,GGemini google;
```

Key property: **no first-party backend exists**. The three external dependencies are all
Google services the user already trusts, contacted directly from the browser.

> The granular handshaking behind each edge above (exact API calls, sequence diagrams,
> retry/CAS protocols, data contracts) is specified in the companion
> [Low-Level Design](low-level-design.md).

### 2.1 Layered module map (proposed)

```
src/
  app/                # React Router v7 routes (SPA), layouts
  components/         # shadcn/ui-based presentational components
  features/
    auth/             # GIS init, token state, sign-in/out
    settings/         # BYOK key management UI + storage
    projects/         # list/detail/create/edit project UIs
    extraction/       # AI document extraction workflow + review step
  services/
    drive/            # Drive REST client: manifest read/write, file upload/download
    gemini/           # GenAI client: multimodal extraction calls
    storage/          # localStorage wrappers (typed)
  domain/             # pure types + tax logic (no I/O)
  lib/                # utils (uuid, money, dates, result types)
```

Rationale: services own all I/O and are individually mockable; `domain/` is pure and unit-
testable; `features/` compose services + components. This separation matters for a 20-year
codebase where dependencies will be swapped over time.

---

## 3. Technology Decisions & Rationale

| Layer | Choice | Notes / risks |
| --- | --- | --- |
| Routing/build | React Router v7 **SPA mode** | Compiles to static HTML/JS/CSS. No loaders/actions that require a server runtime — data is fetched client-side. Confirm `ssr: false` in `react-router.config.ts`. |
| Styling | Tailwind v4 (Oxide/Rust engine) | v4 changes config (CSS-first `@theme`, no `tailwind.config.js` required). shadcn/ui has a v4-compatible track — pin versions. |
| Components | shadcn/ui + Radix | Copied-in components (not a dependency) → good for longevity (you own the code). |
| Language | TypeScript strict | `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. Lint rule banning `any`. |
| Validation | **zod** (decided) | Runtime validation of manifest + API payloads. Critical because Drive data and AI output are untrusted at parse time. |
| Auth | Google Identity Services (token model) | Browser-only; see §5 for the token-lifetime caveat. |
| AI | `@google/genai` SDK, `gemini-2.5-flash` | Multimodal (image + PDF). BYOK key from `localStorage`. |

---

## 4. Data Model & Storage Design

### 4.1 Storage location
- Primary index: `appDataFolder/manifest.json` (hidden, per-user, per-app Drive space).
- Document files: stored in a **user-visible Drive folder** (decision B6), created/managed via
  the `drive.file` scope, and referenced by `fileId` in each project's `attachments`. This
  keeps receipts findable in the normal Drive UI even if this app disappears (longevity, §9).
  Only the `manifest.json` index lives in the hidden `appDataFolder`.

### 4.2 Manifest schema (canonical)

The **cost-basis-aware** schema below is the canonical model (decision C9). The work order's
original single-`taxDeductibleAmount` shape is retained only as a migration source.

```jsonc
{
  "schemaVersion": 1,                  // integer for migration logic
  "lastUpdated": "ISO-8601",
  "summary": {
    "totalCostBasisAdded": 0.00,       // sum of capital improvements (basis adjustments)
    "totalDeductible": 0.00            // sum of amounts that are *actually* deductible/credited
  },
  "projects": [
    {
      "id": "uuid",
      "title": "string",
      "completionDate": "YYYY-MM-DD",
      "totalCost": 0.00,
      "taxTreatment": "capital_improvement" | "repair" | "deductible" | "credit" | "unknown",
      "costBasisAdjustment": 0.00,     // for capital improvements
      "deductibleAmount": 0.00,        // for the narrow deductible/credit cases
      "irsJustification": "string",    // AI-assisted, human-confirmed
      "confidence": 0.0,               // AI extraction confidence (0..1), for review UI
      "attachments": [
        { "fileId": "string", "filename": "string", "mimeType": "string", "sizeBytes": 0 }
      ],
      "createdAt": "ISO-8601",
      "updatedAt": "ISO-8601"
    }
  ]
}
```

This model exists because of the domain accuracy issue in §6 — a single `taxDeductibleAmount`
field conflates two very different tax mechanics.

> **Migration from the work order baseline:** `version: "1.0"` → `schemaVersion: 1`;
> `summary.totalDeductions` is split into `totalCostBasisAdded` + `totalDeductible`; each
> project's `taxDeductibleAmount` maps to `deductibleAmount` with `taxTreatment: "unknown"`
> until reclassified.

### 4.3 Concurrency & durability (decision B4)
A single `manifest.json` over 20 years is a single point of failure and a multi-device write
hazard, so the following safeguards are **adopted**:
- **Optimistic concurrency:** read the Drive file's `headRevisionId`/ETag; on write, verify it
  hasn't changed (conditional update). On conflict, re-read, merge, retry.
- **Backups:** before each write, copy current manifest to a rotating `manifest.bak.N.json`.
- **Atomic writes:** upload new content then update pointer (Drive update is atomic per file).
- **Schema migrations:** `schemaVersion` gate with forward-only migration functions.

---

## 5. Authentication & Token Lifecycle

### 5.1 Flow
1. App loads GIS script; user clicks "Sign in with Google".
2. GIS **token client** requests an OAuth2 **access token** with scopes (see §5.3).
3. Access token held **in memory only** (per work order). Used as a Bearer token for Drive.

### 5.2 Token model & lifecycle (decision A1)
Pure browser GIS uses the **implicit/token model**, which returns a **short-lived access
token (~1 hour) and NO refresh token**. **Adopted approach:**
- Hold the access token **in memory only**.
- Proactively perform a **silent re-request** (`prompt: ''`) shortly before expiry while the
  Google session is alive.
- Accept **full re-auth on hard page refresh / new tab** (acceptable UX tradeoff for the
  stronger security posture).

### 5.3 Scopes (decision A3)
- `https://www.googleapis.com/auth/drive.appdata` — hidden app data, for `manifest.json`.
- `https://www.googleapis.com/auth/drive.file` — for the user-visible attachments folder this
  app creates/manages. Scoped to app-created files only; avoids full-`drive` over-permissioning.

### 5.4 OAuth client config (decision A2 — provision new)
Requires a Google Cloud project with an **OAuth Client ID** whose **Authorized JavaScript
origins** exactly match the hosting domain(s) — both the `*.pages.dev` URL and any future
custom domain (see §8). No client exists yet; provisioning steps will be documented in the
repo (a `docs/google-cloud-setup.md` to be added during P1).

---

## 6. Tax Domain Modeling — important accuracy note (decision C9: cost-basis-aware)

The work order frames everything as `taxDeductibleAmount` / `totalDeductions`. For a
**personal residence**, this is usually **not** how it works (IRS Pub 523/530):

- **Capital improvements** (new roof, addition, HVAC, remodel) are generally **NOT deductible**.
  They **increase the home's cost basis**, which **reduces capital-gains tax when you sell**.
- **Repairs/maintenance** generally have **no** tax effect for a personal residence.
- **Genuinely deductible / creditable** cases are narrower: energy-efficiency credits
  (e.g. §25C/§25D), medically necessary improvements (as itemized medical expense, net of
  value added), and the business-use-of-home / rental allocation portion.

**Adopted:** model both mechanics explicitly (see `taxTreatment`, `costBasisAdjustment`,
`deductibleAmount` in §4.2) and have the AI + UI classify each project rather than assuming
everything is "deductible." This avoids giving the user a misleading "total deductions" number
that could cause a filing error. The app must also display a clear disclaimer that it is **not
tax advice**.

---

## 7. AI Document Extraction

### 7.1 Flow
1. User uploads a document (image/PDF) in the "new/edit project" UI.
2. File is sent **directly** to Gemini via the GenAI SDK using the BYOK key.
3. Model returns structured JSON conforming to a strict schema (use Gemini structured
   output / `responseSchema`) — fields: cost, date, vendor, suggested treatment, justification.
4. **Human review step [recommended — C8]:** extracted values are shown for confirmation/edit
   *before* being written to the manifest, with the `confidence` score surfaced.
5. On confirm: attachment uploaded to Drive, manifest updated (§4.3 safeguards).

### 7.2 Inputs (decision C7: images + PDFs)
Supported inputs: **phone photos / scanned images and PDFs** (including multi-page invoices).
Small files are sent inline (base64); larger files use the Gemini **File API**. Multi-page
PDFs are passed as a single document where the model supports it, else split per page.

### 7.3 BYOK key handling (decision D11: add CSP + warning)
Key stored in `localStorage` per work order. Risk: any XSS can read it (and the access token).
**Adopted mitigations:** a strict **CSP** (real response header via Cloudflare Pages `_headers`,
see §8), no third-party script tags, an in-UI **warning** about the key being stored locally,
and an optional **session-only mode** (hold the key in memory for the session instead of
`localStorage`). Note: client-side "encryption" of the key offers limited real protection since
the decrypt path is also in the client.

---

## 8. Hosting & Deployment (decision D10: Cloudflare Pages)

Source of truth stays on **GitHub**; the static build is deployed to **Cloudflare Pages**
(free tier, global CDN). Cloudflare Pages was chosen over GitHub Pages specifically because it
can serve **real HTTP response headers** — required for the strict CSP in §7.3/§10 (GitHub
Pages can only do a weaker `<meta http-equiv>` CSP).

- **Domain:** default `*.pages.dev` subdomain (e.g. `capital-improvements-tracker.pages.dev`);
  a **custom domain** can be attached later at no cost (Cloudflare Registrar or external DNS).
  The `pages.dev` URL remains a permanent fallback.
- **Security headers:** a `_headers` file ships the CSP (self + Google endpoints only), HSTS,
  `X-Content-Type-Options`, `Referrer-Policy`, and frame-ancestors lockdown.
- **SPA routing:** native single-page fallback (serve `index.html` for unmatched client routes).
- **OAuth origins:** register **both** the `pages.dev` URL and any custom domain as Authorized
  JavaScript origins (§5.4).
- **CI/CD:** Cloudflare Pages builds directly from the GitHub repo on push to `main`
  (preview deployments for PRs).

### 8.1 Hosting is portable (why D10 is low-stakes / reversible)

The build output is just static files, fully decoupled from any host, and the app's data lives
in the user's Google Drive (never on the host). Migrating to another static host (Firebase
Hosting, Netlify, GitHub Pages, S3+CloudFront) is a ~15–30 min change with **zero application
code changes**:

1. Point the new host at the same GitHub repo (or upload the build output).
2. Re-express the security headers in the host's format: `_headers` (Cloudflare) ↔ `headers`
   in `firebase.json` (Firebase) ↔ `netlify.toml`. Same CSP, different file. *(Caveat: GitHub
   Pages can't serve real headers — only a weaker `<meta>` CSP.)*
3. Update the OAuth **Authorized JavaScript origins** to the new domain in Google Cloud.
4. Repoint DNS only if using a custom domain.

No data migration is ever required. Treat the host as swappable infrastructure.

---

## 9. Longevity (20-year) Strategy (decision D13: include if feasible)

- **Pin & vendor** dependencies; commit lockfile; prefer shadcn (owned code) over heavy libs.
- Minimize runtime dependencies; avoid services that can disappear (other than Google core).
- **PWA/offline** (adopted for v1 if feasible): cached app shell so the UI keeps working even
  if hosting lapses; Drive sync resumes when back online.
- Document the Google Cloud project / OAuth client (`docs/google-cloud-setup.md`) so it can be
  recreated.
- Provide **data export** (decision B5): download `manifest.json` + a human-readable CSV/PDF so
  data is never trapped. (Attachments already live in a visible Drive folder per §4.1.)

---

## 10. Security Summary

- No central server ⇒ no server-side credential exposure surface.
- Threats concentrate in the browser: **XSS** (would expose access token + BYOK key) and
  **supply-chain** (malicious dependency). Mitigations: strict CSP, no third-party script tags,
  minimal/pinned deps, SRI where applicable.
- Access token in memory only; BYOK key in `localStorage` (see §7.3 tradeoff).
- All traffic over HTTPS directly to Google; no proxy.
- **Runaway-usage failsafes:** because there's no backend to throttle calls, a bug (e.g. a
  render/`useEffect` loop) could burn API quota or Gemini tokens fast. The design mandates
  layered client guards — a per-gesture call budget, a global frequency circuit breaker, per-API
  rate limiters/breakers, bounded retries, and a daily/session AI spend budget — plus
  provider-side quota caps and API-key restrictions. Specified in LLD §13.

---

## 11. Testing Strategy (proposed)

- **Unit:** `domain/` tax logic + money/date utils (pure, high coverage).
- **Contract:** zod schemas validate manifest + AI output; fixtures for malformed data.
- **Service mocks:** Drive + Gemini clients mocked for feature tests.
- **E2E:** Playwright smoke test of sign-in (mock), create project, extraction review, persist.
- **Type safety:** `tsc --noEmit` + ESLint `no-explicit-any` in CI gate.

---

## 12. Phased Roadmap (proposed)

1. **P0 — Skeleton:** RR7 SPA scaffold, Tailwind v4 + shadcn, strict TS config, Cloudflare
   Pages deploy + `_headers` CSP.
2. **P1 — Auth:** GIS sign-in, token lifecycle (§5), settings + BYOK storage,
   `docs/google-cloud-setup.md`.
3. **P2 — Storage:** Drive service, manifest read/write with concurrency + backups (§4.3).
4. **P3 — Projects CRUD:** list/detail/create/edit, money/date handling, summary totals.
5. **P4 — AI extraction:** Gemini multimodal + structured output + human review step.
6. **P5 — Tax model:** cost-basis vs deductible treatment, disclaimers, export.
7. **P6 — Hardening:** CSP, PWA/offline, backups/export, longevity docs.

---

## 13. Decisions Log

All questions resolved with the owner on 2026-06-12.

| # | Area | Question | Decision |
| --- | --- | --- | --- |
| A1 | Auth | ~1h token + silent re-auth + re-login on refresh? | **Yes — in-memory token** |
| A2 | Auth | Existing Google OAuth Client ID, or provision new? | **Provision new; document setup** |
| A3 | Auth | `drive.appdata` only, or also `drive.file`? | **Add `drive.file`** |
| B4 | Storage | Optimistic concurrency + backups on the manifest? | **Yes** |
| B5 | Storage | Human-visible export given hidden folder? | **Yes — manifest + CSV/PDF** |
| B6 | Storage | Attachments in `appDataFolder` or visible folder? | **Visible Drive folder** |
| C7 | AI | Which document inputs? | **Images + PDFs** |
| C8 | AI | Human review before saving extracted values? | **Yes** |
| C9 | Tax | Cost-basis-aware model vs literal "deductions"? | **Cost-basis-aware** |
| D10 | Hosting | Hosting target? | **Cloudflare Pages** (source on GitHub) |
| D11 | Security | BYOK key in localStorage acceptable as-is? | **Add CSP + warning + session-only option** |
| D12 | Scope | Single account or multi-account? | **Single account** |
| D13 | Longevity | PWA/offline + vendored deps in v1? | **Yes if feasible** |

---

*This is a living design document. As implementation proceeds, sections will be refined and
this log updated if any decision is revisited.*
