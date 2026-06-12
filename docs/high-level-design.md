# High-Level Design (HLD): Serverless Capital Improvements & Tax Deduction Tracker

**Status:** Draft v0.1 — for review
**Author:** Devin (on behalf of @jbisasky)
**Last updated:** 2026-06-12

> This document captures the architecture and design *intent* before any code is written.
> Sections tagged **[OPEN]** depend on decisions still being gathered from the owner. Where a
> decision is needed to keep moving, a **recommended default** is stated and clearly marked.

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

```
+------------------------------------------------------------------+
|                          Browser (SPA)                           |
|                                                                  |
|  React Router v7 (SPA mode)  +  Tailwind v4  +  shadcn/ui        |
|                                                                  |
|  +------------+   +-------------------+   +-------------------+   |
|  |  Auth      |   |  Domain / State   |   |  Settings (BYOK)  |   |
|  |  (GIS)     |   |  (projects,       |   |  Gemini API key   |   |
|  |  OAuth2    |   |   manifest)       |   |  in localStorage  |   |
|  +-----+------+   +---------+---------+   +---------+---------+   |
|        |                    |                       |             |
|        | access token       | manifest + files      | API key     |
|        v                    v                       v             |
|  +-----------+      +----------------+       +----------------+    |
|  | GIS token |      | Drive Service  |       | Gemini Service |    |
|  | client    |      | (REST v3)      |       | (GenAI SDK)    |    |
|  +-----+-----+      +-------+--------+       +-------+--------+    |
+--------|--------------------|------------------------|-----------+
         |                    |                        |
         v                    v                        v
  accounts.google.com   googleapis.com/drive   generativelanguage.googleapis.com
  (OAuth consent)        (appDataFolder)        (gemini-2.5-flash)
```

Key property: **no first-party backend exists**. The three external dependencies are all
Google services the user already trusts, contacted directly from the browser.

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
| Validation | **[OPEN]** zod (recommended) | Runtime validation of manifest + API payloads. Critical because Drive data and AI output are untrusted at parse time. |
| Auth | Google Identity Services (token model) | Browser-only; see §5 for the token-lifetime caveat. |
| AI | `@google/genai` SDK, `gemini-2.5-flash` | Multimodal (image + PDF). BYOK key from `localStorage`. |

---

## 4. Data Model & Storage Design

### 4.1 Storage location
- Primary index: `appDataFolder/manifest.json` (hidden, per-user, per-app Drive space).
- Document files: uploaded to Drive; referenced by `fileId` in each project's `attachments`.
  - **[OPEN]** Whether attachments live in `appDataFolder` (hidden) or a **visible** Drive
    folder. See §7 risk on longevity. *Recommended:* visible folder via `drive.file` scope so
    the user can always find their own documents even if this app disappears.

### 4.2 Manifest schema (as specified, with proposed refinements)

The work order schema is the baseline:

```jsonc
{
  "version": "1.0",
  "lastUpdated": "ISO-8601-Timestamp",
  "summary": { "totalDeductions": 0.00 },
  "projects": [
    {
      "id": "string-uuid",
      "title": "string",
      "completionDate": "YYYY-MM-DD",
      "totalCost": 0.00,
      "taxDeductibleAmount": 0.00,
      "irsJustification": "string",
      "attachments": [
        { "fileId": "google-drive-file-id", "filename": "string", "mimeType": "string" }
      ]
    }
  ]
}
```

**Proposed refinements [OPEN — pending §7/C9 decision]:**

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

The refinement exists because of the domain accuracy issue in §6 — keeping a single
`taxDeductibleAmount` field conflates two very different tax mechanics.

### 4.3 Concurrency & durability **[OPEN — recommend adopting]**
A single `manifest.json` over 20 years is a single point of failure and a multi-device write
hazard. Recommended safeguards:
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

### 5.2 The critical caveat **[OPEN — needs owner decision A1]**
Pure browser GIS uses the **implicit/token model**, which returns a **short-lived access
token (~1 hour) and NO refresh token**. Consequences:
- Token cannot be silently renewed indefinitely without user interaction; GIS supports
  *silent* re-request (`prompt: ''`) while the Google session is alive, which we should use to
  refresh before expiry.
- Holding token in memory only ⇒ **full re-auth on page refresh / new tab**.

**Recommended default:** in-memory token + proactive silent re-auth shortly before expiry;
accept re-login on hard refresh. If that UX is too aggressive, the alternative is persisting
the token (sessionStorage) — weaker security, still no true refresh token. *Confirm A1.*

### 5.3 Scopes **[OPEN — A3]**
- `https://www.googleapis.com/auth/drive.appdata` (hidden app data) — required for manifest.
- *Recommended add:* `https://www.googleapis.com/auth/drive.file` so attachments can live in a
  user-visible folder (longevity). Minimizes scope vs. full `drive`.

### 5.4 OAuth client config **[OPEN — A2]**
Requires a Google Cloud project with an **OAuth Client ID** whose **Authorized JavaScript
origins** exactly match the hosting domain (see §8). Owner to confirm whether one exists or
needs provisioning (I can document the exact steps).

---

## 6. Tax Domain Modeling — important accuracy note **[OPEN — C9]**

The work order frames everything as `taxDeductibleAmount` / `totalDeductions`. For a
**personal residence**, this is usually **not** how it works (IRS Pub 523/530):

- **Capital improvements** (new roof, addition, HVAC, remodel) are generally **NOT deductible**.
  They **increase the home's cost basis**, which **reduces capital-gains tax when you sell**.
- **Repairs/maintenance** generally have **no** tax effect for a personal residence.
- **Genuinely deductible / creditable** cases are narrower: energy-efficiency credits
  (e.g. §25C/§25D), medically necessary improvements (as itemized medical expense, net of
  value added), and the business-use-of-home / rental allocation portion.

**Design implication:** model both mechanics explicitly (see `taxTreatment`,
`costBasisAdjustment`, `deductibleAmount` in §4.2) and have the AI + UI classify each project
rather than assuming everything is "deductible." This avoids giving the user a misleading
"total deductions" number that could cause a filing error.

**Decision needed:** adopt cost-basis-aware model (recommended) vs. keep literal "deductions"
framing from the work order. Either way: the app should display a clear disclaimer that it is
not tax advice.

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

### 7.2 Inputs **[OPEN — C7]**
Need to confirm expected document types (phone photos, scanned multi-page PDFs, emailed
receipts). This drives whether we send inline base64 vs. Gemini File API and how we chunk
multi-page PDFs.

### 7.3 BYOK key handling **[OPEN — D11]**
Key stored in `localStorage` per work order. Risk: any XSS can read it (and the access token).
Mitigations to consider: strict CSP, no third-party scripts, optional session-only mode, and a
clear in-UI warning. Note: client-side "encryption" of the key offers limited real protection
since the decrypt path is also in the client.

---

## 8. Hosting & Deployment **[OPEN — D10]**

Static output can be hosted anywhere that serves files. *Recommended default:* **GitHub Pages**
(free, durable, matches the personal-GitHub setup). Considerations:
- SPA fallback routing (404 → index.html) for client-side routes.
- OAuth **Authorized JavaScript origins** must match the Pages domain (and any custom domain).
- **CSP** allowing only Google endpoints + self; this is the main XSS mitigation for §7.3.
- CI: GitHub Actions build + deploy to Pages.

---

## 9. Longevity (20-year) Strategy **[OPEN — D13]**

- **Pin & vendor** dependencies; commit lockfile; prefer shadcn (owned code) over heavy libs.
- Minimize runtime dependencies; avoid services that can disappear (other than Google core).
- Consider **PWA/offline** so the app keeps working if hosting lapses (cached shell + Drive).
- Document the Google Cloud project / OAuth client so it can be recreated.
- Provide **data export** (download manifest + a human-readable CSV/PDF) so data is never
  trapped — especially important if attachments live in hidden `appDataFolder`.

---

## 10. Security Summary

- No central server ⇒ no server-side credential exposure surface.
- Threats concentrate in the browser: **XSS** (would expose access token + BYOK key) and
  **supply-chain** (malicious dependency). Mitigations: strict CSP, no third-party script tags,
  minimal/pinned deps, SRI where applicable.
- Access token in memory only; BYOK key in `localStorage` (see §7.3 tradeoff).
- All traffic over HTTPS directly to Google; no proxy.

---

## 11. Testing Strategy (proposed)

- **Unit:** `domain/` tax logic + money/date utils (pure, high coverage).
- **Contract:** zod schemas validate manifest + AI output; fixtures for malformed data.
- **Service mocks:** Drive + Gemini clients mocked for feature tests.
- **E2E:** Playwright smoke test of sign-in (mock), create project, extraction review, persist.
- **Type safety:** `tsc --noEmit` + ESLint `no-explicit-any` in CI gate.

---

## 12. Phased Roadmap (proposed)

1. **P0 — Skeleton:** RR7 SPA scaffold, Tailwind v4 + shadcn, strict TS config, CI to Pages.
2. **P1 — Auth:** GIS sign-in, token lifecycle (§5), settings + BYOK storage.
3. **P2 — Storage:** Drive service, manifest read/write with concurrency + backups (§4.3).
4. **P3 — Projects CRUD:** list/detail/create/edit, money/date handling, summary totals.
5. **P4 — AI extraction:** Gemini multimodal + structured output + human review step.
6. **P5 — Tax model:** cost-basis vs deductible treatment, disclaimers, export.
7. **P6 — Hardening:** CSP, PWA/offline, backups/export, longevity docs.

---

## 13. Open Questions (consolidated)

| # | Area | Question | Recommended default |
| --- | --- | --- | --- |
| A1 | Auth | Accept ~1h token + silent re-auth + re-login on refresh? | Yes (in-memory) |
| A2 | Auth | Existing Google OAuth Client ID, or provision new? | Document provisioning |
| A3 | Auth | `drive.appdata` only, or also `drive.file`? | Add `drive.file` |
| B4 | Storage | Add optimistic concurrency + backups to single manifest? | Yes |
| B5 | Storage | Need human-visible copy/export given hidden folder? | Yes (export) |
| B6 | Storage | Attachments in `appDataFolder` or visible folder? | Visible folder |
| C7 | AI | What document types/inputs to support? | Images + PDFs |
| C8 | AI | Require human review before saving extracted values? | Yes |
| C9 | Tax | Cost-basis-aware model vs literal "deductions"? | Cost-basis-aware |
| D10 | Hosting | Hosting target? | GitHub Pages |
| D11 | Security | BYOK key in localStorage acceptable as-is? | Add CSP + warning |
| D12 | Scope | Single account or multi-account? | Single |
| D13 | Longevity | PWA/offline + vendored deps in v1? | Yes if feasible |

---

*This is a living design document. Once the open questions are resolved, sections will be
updated and the [OPEN] tags removed.*
