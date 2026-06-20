# UI/UX Low-Level Design: Screens, Features & Flows

**Status:** Draft v0.1 — companion to the [HLD](high-level-design.md) and [LLD](low-level-design.md)
**Author:** Devin (on behalf of @jbisasky)
**Last updated:** 2026-06-12

> This document specifies **what the user sees and does**: the feature set, information
> architecture, every screen (with wireframes), the core flows, and — critically — the
> **non-happy-path states** (loading / empty / error / offline / conflict / auth-expired /
> budget-exceeded) mapped to the error taxonomy in [LLD §11](low-level-design.md#11-error-taxonomy--user-messaging).
> Built with shadcn/ui (Radix) + Tailwind v4; mobile-first because receipts are captured on phones.

## Table of contents
1. [Design principles](#1-design-principles)
2. [Feature list (MVP vs later)](#2-feature-list-mvp-vs-later)
3. [Information architecture & navigation](#3-information-architecture--navigation)
4. [Global layout & shell](#4-global-layout--shell)
5. [Screen inventory (wireframes)](#5-screen-inventory-wireframes)
6. [Core user flows](#6-core-user-flows)
7. [State coverage matrix](#7-state-coverage-matrix)
8. [Component inventory (shadcn/ui)](#8-component-inventory-shadcnui)
9. [Responsive & mobile capture](#9-responsive--mobile-capture)
10. [Accessibility](#10-accessibility)
11. [Visual design & theming](#11-visual-design--theming)
12. [Loading & perceived performance](#12-loading--perceived-performance)
13. [Microcopy & legal](#13-microcopy--legal)

---

## 1. Design principles

- **Trust & clarity over flash.** This is a financial record that must be legible in 20 years.
  Plain language, generous spacing, no dark patterns.
- **Mobile-first capture, desktop-first review.** Adding a receipt happens on a phone; reviewing
  totals and exporting happens on a laptop. Both must be first-class.
- **AI assists, the human decides.** Every AI-extracted value is editable and must be confirmed
  before it's saved (LLD §9). Confidence is shown, never hidden.
- **Honest about money & tax.** Distinguish *cost basis* from *deductible* everywhere; always show
  the "not tax advice" disclaimer near any tax figure (HLD §6).
- **Every state is designed.** Loading, empty, error, offline, and conflict are not afterthoughts.
- **Reversible & recoverable.** Destructive actions confirm; data is exportable; backups exist.

---

## 2. Feature list (MVP vs later)

### MVP (v1)
| Area | Feature |
| --- | --- |
| Auth | Google sign-in (GIS), sign-out, session-expiry re-auth prompt |
| Settings | BYOK Gemini key entry (+ session-only toggle), AI budget caps, key/connection status |
| Projects | Create / read / update / delete improvement projects |
| Attachments | Upload receipts/invoices (image/PDF), view/download, remove |
| AI extraction | Extract fields from a document → **review/confirm** screen → save |
| Tax model | Per-project `taxTreatment`, cost-basis vs deductible amounts, justification |
| Dashboard | Summary cards (total cost basis added, total deductible, project count) |
| Search/filter | Filter projects by year, treatment, text search by title/vendor |
| Export | Download `manifest.json` + human-readable CSV/PDF |
| Resilience | Loading/empty/error states, conflict resolution UI, diagnostics log |
| Disclaimers | "Not tax advice" persistent affordance |

| Resilience | PWA offline read-only: service worker caches app shell + manifest; browse existing data offline; writes disabled until connectivity returns |

### Later (post-v1)
- Queued offline writes (edit while offline → sync on reconnect).
- Per-year **cost-basis report** view (running adjusted basis over time).
- Bulk import (multi-file drop → batched extraction with a review queue).
- Tag/category taxonomy and per-room or per-system grouping.
- Reminders (e.g. "tax season — review unclassified projects").
- Photo annotation, multi-page document stitching UI.
- Optional encryption-at-rest passphrase for the BYOK key.

---

## 3. Information architecture & navigation

```mermaid
flowchart TD
    Landing["/ (Landing / Sign-in)"] -->|signed in| Dash["/dashboard"]
    Landing -->|see a demo| Demo["/demo/dashboard"]
    Demo -->|sign in to use your own data| Landing
    Dash --> Projects["/projects (list)"]
    Projects --> Detail["/projects/:id"]
    Projects --> New["/projects/new"]
    Detail --> Edit["/projects/:id/edit"]
    New --> Review["Extraction review (modal/step)"]
    Edit --> Review
    Dash --> Settings["/settings"]
    Settings --> Diag["/settings/diagnostics"]
    Dash --> Export["/export"]
    Settings --> About["/about (disclaimer, version)"]
```

Primary nav (always reachable): **Dashboard · Projects · Add · Export · Settings**. On mobile this
collapses to a bottom tab bar with a center **Add (＋)** action; on desktop it's a left rail or top bar.

---

## 4. Global layout & shell

### Desktop layout

![Desktop shell — left rail navigation, top bar with search/sync/account, footer disclaimer](mockups/02-dashboard.png)

<details><summary>ASCII wireframe (original)</summary>

```
DESKTOP                                              
┌───────────────────────────────────────────────────────────┐
│ ◑ Capital Improvements         [search…]      ⟳  ◧  ⚙  (J) │  ← top bar: brand, search, sync, theme, settings, account
├───────────┬───────────────────────────────────────────────┤
│ Dashboard │                                                │
│ Projects  │              <route content>                   │
│ Add  ＋   │                                                │
│ Export    │                                                │
│ Settings  │                                                │
│           │                                                │
│ ── status │  ⚠ Not tax advice · ● Synced 2m ago            │  ← persistent footer strip
└───────────┴───────────────────────────────────────────────┘
```

</details>

### Mobile layout

![Mobile shell — bottom tab bar with center Add button, compact header, synced footer](mockups/09-mobile-layout.png)

<details><summary>ASCII wireframe (original)</summary>

```
MOBILE
┌───────────────────────────┐
│ ◑ Capital Improvements  (J)│
│ [search…]                  │
│                            │
│      <route content>       │
│                            │
│ ⚠ Not tax advice · ●Synced │
├───────────────────────────┤
│ ▣Dash  ▤Proj  ＋  ⭳Exp  ⚙ │  ← bottom tab bar, center Add
└───────────────────────────┘
```

</details>

Persistent elements:
- **Sync indicator** (`⟳`/`●`): idle / syncing / synced (with timestamp) / error. Reflects Drive
  CAS write status (LLD §6). Click → last-sync details / retry.
- **"Not tax advice"** chip: always visible, links to the disclaimer in /about.
- **Account menu** `(J)`: email, sign out, switch is N/A (single account, HLD D12).

---

## 5. Screen inventory (wireframes)

### 5.1 Landing / Sign-in (`/`)

| Desktop | Mobile |
| --- | --- |
| ![Landing page — sign-in + demo button, privacy bullets, disclaimer](mockups/01-landing.png) | ![Mobile landing](mockups/m01-landing.png) |

<details><summary>ASCII wireframe (original)</summary>

```
┌───────────────────────────────────────────┐
│              ◑  Capital Improvements        │
│   Track home improvements & their tax       │
│   impact — privately, in your own Drive.    │
│                                             │
│        [  Sign in with Google  ]            │
│        [  See a demo           ]            │
│                                             │
│  • Your data stays in YOUR Google Drive     │
│  • No server ever sees your files or keys   │
│  • Bring your own Gemini key for AI         │
│                                             │
│  ⚠ Not tax advice. For recordkeeping only.  │
└───────────────────────────────────────────┘
```

</details>

- **Primary CTA:** "Sign in with Google." **Secondary CTA:** "See a demo" — navigates to
  `/demo/dashboard` with pre-populated fixture data (HLD D14, LLD §16). No auth required.
- Below the fold: privacy explainer + what you'll need (Google account, an AI
  Studio key). Error inline if GIS init fails (origin mismatch → friendly "config issue" note).

### 5.2 Dashboard (`/dashboard`)

| Desktop | Mobile |
| --- | --- |
| ![Dashboard — summary cards, educational banner, recent projects table](mockups/02-dashboard.png) | ![Mobile dashboard](mockups/m02-dashboard.png) |

<details><summary>ASCII wireframe (original)</summary>

```
┌─────────────────────────────────────────────────────────┐
│ Overview                                  Tax year: 2025 ▾│
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│ │ Cost basis + │ │ Deductible   │ │ Projects     │       │
│ │  $42,300     │ │  $1,200      │ │  17          │       │
│ │ this year    │ │ (credits)    │ │ 3 unclassified│      │
│ └──────────────┘ └──────────────┘ └──────────────┘       │
│ ⚠ "Deductible" is rare for a primary home — most items    │
│    raise cost basis. Learn more →                         │
│                                                           │
│ Recent projects                          [View all →]     │
│ • New roof              2025-04   $18,000  Capital impr.   │
│ • HVAC replacement      2025-02   $9,500   Capital impr.   │
│ • Attic insulation      2025-01   $2,300   Credit (§25C)   │
│                                                           │
│ [ ＋ Add improvement ]                                     │
└─────────────────────────────────────────────────────────┘
```

</details>
- Summary cards are **derived** values (LLD §6.3). "Unclassified" badge nudges the user to set
  `taxTreatment` on `unknown` items. Year selector filters everything.

### 5.3 Projects list (`/projects`)

| Desktop | Mobile |
| --- | --- |
| ![Projects list — filterable table with treatment chips and attachment counts](mockups/03-projects-list.png) | ![Mobile projects list](mockups/m03-projects-list.png) |

<details><summary>ASCII wireframe (original)</summary>

```
┌─────────────────────────────────────────────────────────┐
│ Projects   [search title/vendor…]  Year▾ Treatment▾ Sort▾ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ☐  New roof            2025-04  $18,000  Capital  📎2 │ │
│ │ ☐  HVAC replacement    2025-02   $9,500  Capital  📎1 │ │
│ │ ☐  Attic insulation    2025-01   $2,300  Credit   📎1 │ │
│ │ ☐  Repaint hallway     2024-11     $600  Repair   📎0 │ │
│ └─────────────────────────────────────────────────────┘ │
│ 4 of 17 shown                       [ ＋ Add improvement ]│
└─────────────────────────────────────────────────────────┘
```

</details>
- Row: title, completion date, cost, treatment chip, attachment count. Tap → detail. Checkboxes
  enable bulk actions (delete/export selection) — later phase for bulk extract.
- Empty state: friendly illustration + "Add your first improvement" + "Import receipts".

### 5.4 Add / Edit project (`/projects/new`, `/projects/:id/edit`)
Two entry modes that converge on the same form:
- **From a receipt** (AI-assisted): drop/scan a file → extraction → review → form prefilled.
- **Manual**: blank form.

| Desktop | Mobile |
| --- | --- |
| ![Add improvement form — attachments, AI extract, fields, tax treatment radios, save](mockups/04-add-edit.png) | ![Mobile add improvement](mockups/m04-add-edit.png) |

<details><summary>ASCII wireframe (original)</summary>

```
┌─────────────────────────────────────────────────────────┐
│ Add improvement                                   [ × ]   │
│ ┌─ Attachments ─────────────────────────────────────────┐│
│ │  [ 📷 Scan / take photo ]  [ ⬆ Upload file ]           ││
│ │  receipt_roof.pdf  ✓ uploaded   [view] [remove]        ││
│ │  ✨ Extract details with AI                             ││
│ └───────────────────────────────────────────────────────┘│
│ Title*           [ New roof                              ] │
│ Completion date* [ 2025-04-12 ]                           │
│ Total cost*      [ $ 18,000.00 ]                          │
│ Tax treatment*   ( ) Capital improvement (cost basis)     │
│                  ( ) Repair (no tax effect)               │
│                  ( ) Deductible   ( ) Credit  ( ) Unknown │
│ Cost-basis adj.  [ $ 18,000.00 ]   Deductible [ $ 0.00 ]  │
│ Justification    [ Full tear-off + replacement…         ] │
│ ⚠ Not tax advice — confirm treatment with a professional. │
│                         [ Cancel ]   [ Save improvement ] │
└─────────────────────────────────────────────────────────┘
```

</details>
- Field-level validation (zod-mirrored). `taxTreatment` drives which amount fields are emphasized
  (capital → cost-basis; credit/deductible → deductible amount).
- The file used for **Extract details with AI** is retained through the review step and persisted
  as a project attachment on **Create Project** (ATT-12, AI-14). Additional files may be added on
  the form step before save.
- Save = attachments-first, manifest-last (LLD §9). Button shows progress; disabled while a budget
  or circuit guard is tripped (LLD §14) with an inline reason.

### 5.5 AI extraction review (modal/step)

| Desktop | Mobile |
| --- | --- |
| ![AI review modal — per-field confidence badges, editable inputs, confirm/discard](mockups/05-ai-review.png) | ![Mobile AI review](mockups/m05-ai-review.png) |

<details><summary>ASCII wireframe (original)</summary>

```
┌─────────────────────────────────────────────────────────┐
│ Review extracted details          confidence: ●●●○ (0.78) │
│ We read this from receipt_roof.pdf. Check & edit before    │
│ saving — nothing is stored until you confirm.             │
│                                                           │
│ Title          [ New roof                  ]  ✦ extracted │
│ Date           [ 2025-04-12 ]                 ✦           │
│ Total cost     [ $18,000.00 ]                 ⚠ low conf  │
│ Vendor         [ ABC Roofing ]                ✦           │
│ Suggested tax  [ Capital improvement ▾ ]      ✦           │
│ Justification  [ Full roof replacement…    ]              │
│                                                           │
│ [ Discard ]                  [ Looks good → continue ]    │
└─────────────────────────────────────────────────────────┘
```

</details>
- Per-field "✦ extracted" markers and **low-confidence warnings** on individual fields. Editing a
  field clears its AI marker. `finishReason != STOP` → fallback banner "couldn't read fully, enter
  manually" (maps to `EXTRACTION_INCOMPLETE`).

### 5.6 Project detail (`/projects/:id`)

| Desktop | Mobile |
| --- | --- |
| ![Project detail — cost/treatment table, justification, attachments list, history](mockups/06-project-detail.png) | ![Mobile project detail](mockups/m06-project-detail.png) |

<details><summary>ASCII wireframe (original)</summary>

```
┌─────────────────────────────────────────────────────────┐
│ ← Projects                              [ Edit ] [ ⋯ ]    │
│ New roof                                                   │
│ Completed 2025-04-12 · ABC Roofing                        │
│ ┌───────────────┐                                         │
│ │ Total cost    │ $18,000.00                              │
│ │ Treatment     │ Capital improvement                     │
│ │ Cost basis +  │ $18,000.00                              │
│ │ Deductible    │ $0.00                                   │
│ └───────────────┘                                         │
│ Justification: Full tear-off and replacement…             │
│ Attachments (2):  📄 receipt_roof.pdf [view] [download]   │
│                   🖼 photo_after.jpg  [view] [download]   │
│ ⚠ Not tax advice.            History: created/updated …   │
└─────────────────────────────────────────────────────────┘
```

</details>
- `⋯` menu: delete (confirm), duplicate, export this project.
- **Upload on detail:** in addition to view/download on existing files, the attachments card includes
  an inline upload zone (same `AttachmentSection` as add/edit — HLD §4.4, ATT-13). Users can add
  receipts after project create without visiting Edit.

### 5.7 Settings (`/settings`)

| Desktop | Mobile |
| --- | --- |
| ![Settings — account, BYOK key, usage limits, data export, appearance toggle](mockups/07-settings.png) | ![Mobile settings](mockups/m07-settings.png) |

<details><summary>ASCII wireframe (original)</summary>

```
┌─────────────────────────────────────────────────────────┐
│ Settings                                                  │
│ Account                                                   │
│   Signed in as jordan@… [ Sign out ]                      │
│   Drive: ● Connected (drive.file, appdata)                │
│                                                           │
│ AI (Bring Your Own Key)                                   │
│   Gemini API key [ •••••••••••••  ] [ Save ] [ Test ]     │
│   ☐ Session-only (don't store in this browser)            │
│   Status: ● Valid · model gemini-2.5-flash                │
│   ⚠ Stored in this browser's localStorage. Anyone with    │
│     access to this device/browser could read it.          │
│                                                           │
│ Usage limits (runaway protection)                         │
│   Max AI calls / day      [ 200 ]                         │
│   Max AI tokens / day     [ 2,000,000 ]                   │
│   Max AI calls / session  [ 50 ]    Used today: 12        │
│                                                           │
│ Data                                                      │
│   [ Export all ]  [ Restore from backup ]  [ Diagnostics ]│
│ Appearance: ( ) System ( ) Light ( ) Dark                 │
└─────────────────────────────────────────────────────────┘
```

</details>
- BYOK warning is explicit (decision D11). "Test" pings Gemini with a trivial call (counts against
  budget). Budgets back LLD §14.5; "used today" reflects the persisted counter.

### 5.8 Export (`/export`)

| Desktop | Mobile |
| --- | --- |
| ![Export — format and scope radio groups, info note, download button](mockups/08-export.png) | ![Mobile export](mockups/m08-export.png) |

<details><summary>ASCII wireframe (original)</summary>

```
┌─────────────────────────────────────────────────────────┐
│ Export your data                                          │
│ Format:  ( ) manifest.json (full backup)                  │
│          ( ) CSV (spreadsheet)                            │
│          ( ) PDF summary (per tax year)                   │
│ Scope:   ( ) All   ( ) Year [2025 ▾]   ( ) Selected       │
│ Note: attachments live in your Drive folder "Capital      │
│ Improvements (App Data)" and are not bundled here.        │
│                                   [ Download ]            │
└─────────────────────────────────────────────────────────┘
```

</details>

### 5.9 Diagnostics (`/settings/diagnostics`)
- Read-only ring-buffer log (LLD §14.7): timestamped events incl. `LOOP_GUARD_TRIPPED`,
  `CIRCUIT_OPEN`, `AI_BUDGET_EXCEEDED`, sync conflicts. "Copy log" (redacted) for support.

### 5.10 About (`/about`)
- App version, the full **not-tax-advice disclaimer**, links to HLD/LLD, Google Cloud setup, and
  a "how your data is stored" privacy explainer.

---

## 6. Core user flows

### 6.1 First-run onboarding
```mermaid
flowchart TD
    A[Landing] --> B[Sign in with Google]
    A --> G["See a demo"]
    G --> H["/demo/dashboard — read-only sandbox<br/>with sample data + persistent banner"]
    H -->|sign in to use your own data| A
    B --> C{BYOK key set?}
    C -- no --> D[Prompt: add Gemini key in Settings<br/>or skip & enter projects manually]
    C -- yes --> E[Dashboard - empty state]
    D --> E
    E --> F[Add first improvement - guided]
```
First run shows an **empty dashboard** with a one-card guide. AI features are gated behind a key but
the app is fully usable manually without one (graceful degradation).

### 6.2 Add improvement from a receipt (happy path)
```mermaid
sequenceDiagram
    actor U as User
    participant UI
    U->>UI: tap Add ＋ → Scan/Upload
    UI->>UI: preview file, validate type/size
    U->>UI: ✨ Extract with AI
    UI-->>U: spinner → Review screen (prefilled, confidence)
    U->>UI: edit/confirm fields, pick treatment
    U->>UI: Save
    UI-->>U: progress (upload → write) → success toast, lands on detail
```

### 6.3 Session expiry mid-task
- Non-blocking banner: "Your Google session expired. **Reconnect** to keep working." In-progress
  form data is preserved in memory; after re-auth the pending save resumes (maps to `AUTH_REQUIRED`,
  LLD §4.6). Never lose typed input.

### 6.4 Edit conflict (two devices)
- On CAS conflict (LLD §6), show a **diff dialog**: "This project changed on another device." Side-
  by-side fields, choose **Keep mine / Keep theirs / Merge**. Summary recomputed after.

---

## 7. State coverage matrix

Every data-bearing screen must implement these. Mapped to LLD §11 codes where applicable.

| State | Where | UX |
| --- | --- | --- |
| **Loading** | dashboard, list, detail | skeleton rows/cards (not spinners) |
| **Empty** | first run, filtered-to-zero | illustration + primary CTA + secondary hint |
| **Auth required** | global | banner + "Reconnect"; preserve in-flight input (`AUTH_REQUIRED`) |
| **Insufficient scope** | after consent | "Re-grant Drive access" CTA (`INSUFFICIENT_SCOPE`) |
| **Offline** | global | "You're offline — viewing last synced data"; writes disabled/queued (later: queue) |
| **Sync conflict** | save | diff dialog (`CONFLICT`) |
| **Read corrupt** | boot | "Couldn't read your data" → restore backup / export (`READ_CORRUPT`) |
| **Upload failed** | add/edit/detail | inline retry on the attachment (`UPLOAD_FAILED`) |
| **Extraction incomplete** | review | fallback to manual + raw text (`EXTRACTION_INCOMPLETE`) |
| **AI key invalid** | extract, settings | inline + Settings deep-link (`API_KEY_INVALID`) |
| **AI quota / budget** | extract | "Daily AI limit reached — raise limit/override" (`AI_BUDGET_EXCEEDED`,`QUOTA`) |
| **Circuit open** | global | "Paused requests to protect your quota — Resume" (`CIRCUIT_OPEN`) |
| **Drive full** | save | "Your Google Drive is full" (`DRIVE_QUOTA`) |
| **Saving / optimistic** | add/edit | button progress; optimistic row with pending indicator |
| **Success** | mutations | toast + state update; no full reload |

---

## 8. Component inventory (shadcn/ui)

| Pattern | shadcn/Radix component |
| --- | --- |
| App shell nav | `NavigationMenu` / custom rail + `Tabs` (mobile bottom bar) |
| Cards (summary, detail) | `Card` |
| Tables / lists | `Table` (desktop) + responsive list rows |
| Forms | `Form` + `Input`, `Label`, `RadioGroup`, `Select`, `Textarea`, `Switch` |
| Currency input | custom `MoneyInput` (integer-cents, LLD §1.2) on `Input` |
| Dialogs | `Dialog` (review, conflict, confirm-delete), `AlertDialog` (destructive) |
| Toasts | `Sonner`/`Toast` for save/sync feedback |
| File upload | custom dropzone + `Progress` |
| Badges/chips | `Badge` (treatment, confidence, "Not tax advice") |
| Tooltips/help | `Tooltip`, `HoverCard` (tax-term explainers) |
| Empty/skeleton | `Skeleton` + custom empty-state |
| Theme | `DropdownMenu` theme switch |

---

## 9. Responsive & mobile capture

- **Breakpoints:** mobile (<640), tablet (≥768), desktop (≥1024). Mobile = bottom tab bar; desktop
  = left rail + top bar.
- **Camera capture:** the file input uses `accept="image/*,application/pdf"` and
  `capture="environment"` on mobile so "Scan / take photo" opens the rear camera directly.
- **Touch targets:** ≥44px; primary actions thumb-reachable (bottom of viewport).
- Tables degrade to stacked rows; long numbers right-aligned and never truncated silently.

---

## 10. Accessibility

- WCAG 2.1 AA: contrast ≥4.5:1; visible focus rings (Radix provides correct focus management).
- Full keyboard operability: tab order, `Esc` closes dialogs, `Enter` submits forms.
- Semantic labels on all inputs; currency fields announce currency. Confidence conveyed by **text +
  icon**, not color alone.
- Live regions for async results (sync status, save success/failure) so screen readers announce them.
- Respect `prefers-reduced-motion` (skeleton/transitions) and `prefers-color-scheme`.

---

## 11. Visual design & theming

- **Tailwind v4** CSS-first `@theme`; tokenized colors/spacing/radii. Light + dark + system.
- Restrained palette: neutral surfaces, one accent for primary actions, semantic colors for
  success/warn/error/info. Tax-treatment chips use distinct but accessible hues + labels.
- Typography: a single legible system/UI font; tabular numerals for money columns.
- Density: comfortable default; compact toggle later for power users.

---

## 12. Loading & perceived performance

Response-time perception follows well-established UX thresholds (Nielsen, 1993). Every
async operation in the app maps to one of the tiers below, with a prescribed indicator.

### 12.1 Response-time tiers

| Tier | Latency | User perception | Indicator strategy |
| --- | --- | --- | --- |
| **Instant** | < 100 ms | Feels immediate; cause & effect fused | None — any visual change is the feedback itself |
| **Acknowledged** | 100 ms – 1 s | Noticeable pause, but flow isn't broken | Subtle inline cue: button state change, slight opacity shift, tiny progress dot |
| **Working** | 1 – 5 s | User knows something is happening; attention may wander | Skeleton placeholder (layout loads), or spinner with label ("Extracting…") |
| **Long** | 5 – 15 s | User may switch tabs; needs reassurance & ability to cancel | Determinate progress bar (or indeterminate with elapsed time / status text) + Cancel button |
| **Very long** | > 15 s | High abandonment risk; user needs estimated time | Stepped progress ("Uploading… Analyzing… Almost done") + Cancel + elapsed timer |

### 12.2 Operation-to-indicator map

| Operation | Expected latency | Tier | Indicator |
| --- | --- | --- | --- |
| In-app navigation (route change) | < 100 ms | Instant | None (React Router instant) |
| Theme toggle | < 100 ms | Instant | Immediate CSS class swap |
| Search / filter (client-side) | < 100 ms | Instant | List re-renders instantly |
| Sign-in (GIS consent popup) | 1–3 s | Working | "Sign in with Google" button shows Google's own popup; on return, landing fades to skeleton dashboard |
| Dashboard load (post-auth) | 1–3 s | Working | **Skeleton cards + skeleton rows** — three summary-card placeholders shimmer, recent-projects rows shimmer |
| Projects list load | 0.5–2 s | Working | **Skeleton rows** — table rows shimmer; filters disabled until data arrives |
| Project detail load | 0.3–1 s | Acknowledged | Skeleton detail card; usually near-instant (manifest already cached) |
| Save project (attachment upload + CAS write) | 1–5 s | Working | **Button progress state** — "Save" → "Saving…" with inline spinner; button disabled; on success: toast + navigate to detail |
| AI extraction (small file, inline) | 3–8 s | Long | **Spinner + label** — "Extracting details…" overlay on the form; Cancel button visible; on complete: transition to Review screen |
| AI extraction (large file, File API) | 8–30 s | Very long | **Stepped progress** — "Uploading file… → Processing… → Extracting…" with elapsed timer; Cancel aborts the File API session |
| Export download (client-side gen) | < 1 s | Acknowledged | Button briefly shows "Generating…" then triggers download |
| Manifest first-run create | 1–2 s | Working | Skeleton dashboard (same as post-auth load) |
| Backup rotation (pre-write) | 0.5–1 s | Acknowledged | No separate indicator — folded into the save button progress |
| Silent token refresh | < 1 s | Acknowledged | No visible indicator when successful; on failure → NeedsInteraction banner |
| BYOK "Test" ping | 1–3 s | Working | "Test" button → "Testing…" spinner → ✓ Valid / ✗ Invalid result inline |

### 12.3 Design rules

1. **Skeletons for layout, spinners for actions.** Initial page loads use skeleton
   placeholders (cards, rows, detail blocks shaped like the real content) to give the user a
   sense of the page structure. Discrete actions ("I clicked a button") use a spinner or
   button-progress state.

2. **Never block the full screen.** Loading indicators are scoped to the region that's
   waiting — a skeleton card, not a full-page overlay. The shell (nav, top bar, footer) remains
   interactive. Exception: the AI extraction overlay covers the form area but not the global
   nav.

3. **Always provide an escape.** Any operation expected to exceed 3 seconds must have a
   **Cancel** affordance. Cancellation triggers `AbortController.abort()` on in-flight
   requests and restores the pre-operation state.

4. **Optimistic rows.** After a successful save, the new/updated project appears immediately
   in the list with a subtle "syncing" indicator (pulse dot), before the CAS write round-trip
   confirms. If the write fails, the row reverts with an error toast.

5. **Transition, don't flash.** If an operation completes in < 300 ms, the skeleton/spinner
   is held for a minimum of 300 ms total to avoid a jarring flash of loading state. This
   prevents the "flicker" that's worse than no indicator at all.

6. **Progressive disclosure on long ops.** Operations over 5 seconds show staged messages
   (e.g. "Uploading → Processing → Extracting") so the user knows the system isn't stuck.

---

## 13. Microcopy & legal

- **Persistent disclaimer:** "Not tax advice — for recordkeeping only. Confirm treatment with a
  qualified professional." Shown near every tax figure and in /about.
- **Cost-basis education:** inline `HoverCard` on "cost basis" / "deductible" / "credit" explaining
  the difference (HLD §6), so the UI actively prevents the common misconception.
- **Privacy reassurance:** "Your data lives in your Google Drive. This app has no server."
- **Tone:** calm, factual, second person. Avoid jargon; expand IRS terms on first use.

---

*Companion to the HLD/LLD. Wireframes are intent, not pixel specs; final spacing/typography land
during P0–P4 implementation.*
