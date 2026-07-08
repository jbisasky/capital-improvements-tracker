---
name: Fix E2E Axe Failures
overview: Fix all real accessibility violations surfaced by the new axe E2E tests, and fix the non-axe test regressions (landing page button not found, settings validation tests, auth redirect tests on webkit).
todos:
  - id: A4
    content: Add aria-label to status filter <select> in list-page.tsx
    status: completed
  - id: A1-A2
    content: "Fix demo banner: role=banner + color-contrast on Exit Demo button"
    status: completed
  - id: A3
    content: Add <h1> to dashboard-page.tsx
    status: completed
  - id: A5
    content: Fix doc health badge color contrast (white on yellow-500) in detail-page.tsx
    status: completed
  - id: A6-A7
    content: "Fix heading-order: h3->h2 in detail-page.tsx and new-project-attachments.tsx"
    status: completed
  - id: A8
    content: Add aria-label=Hero to MobileHeroBlock section in landing-page.tsx
    status: completed
  - id: B1-B2
    content: Fix landing/auth E2E tests broken by aria-hidden on desktop block
    status: completed
  - id: B3
    content: Investigate and fix settings S4/S5 validation E2E failures
    status: completed
  - id: verify
    content: Run full E2E suite to confirm all axe tests pass
    status: completed
isProject: false
---

# Fix All E2E Axe Failures

## Two categories of failures

```
Category A — Real axe violations (source fixes needed)
Category B — Test infrastructure regressions (locator / timeout issues)
```

---

## Category A — Axe violations to fix in source

### A1. `color-contrast` on demo banner — `src/app/demo/layout.tsx` line 12

The "Exit Demo & Connect Drive" desktop button uses `bg-white/20` (20% opacity) over `bg-amber-700`, which resolves to `#c97133` — only 3.56:1. WCAG AA needs 4.5:1 at 12px.

**Fix:** Replace `bg-white/20 hover:bg-white/30` with a solid opaque background that passes. Tailwind's `bg-amber-900` (`#78350f`) gives a dark, high-contrast background; or use `bg-white text-amber-800`. The simplest correct fix is `bg-white/30` → `bg-amber-900 text-white hover:bg-amber-800` or use a border button approach.

- File: [`src/app/demo/layout.tsx`](src/app/demo/layout.tsx)
- Lines 20-23: The `ml-3 hidden ...` Link

### A2. `region` on demo banner — `src/app/demo/layout.tsx` line 12

The fixed amber banner `div` sits outside all landmark regions (it's a sibling of `<AppShell>`). Content must be inside a landmark.

**Fix:** Add `role="banner"` to the amber `div`, which makes it a `header` landmark and satisfies the region rule.

- File: [`src/app/demo/layout.tsx`](src/app/demo/layout.tsx)

### A3. `page-has-heading-one` on demo dashboard

The dashboard page itself doesn't render an `<h1>`. Axe flags this as a best-practice issue.

**Fix:** Add an `<h1>` to [`src/app/dashboard/dashboard-page.tsx`](src/app/dashboard/dashboard-page.tsx). The page likely has a visible title — it just needs to be promoted to `<h1>` (possibly with `sr-only` if visually it's styled differently, but more likely it just needs an explicit `<h1>`).

### A4. `select-name` on projects list — `src/app/projects/list-page.tsx` line 103

The status filter `<select>` has no accessible label.

**Fix:** Wrap in `<label>` or add `aria-label="Filter by status"`:
```tsx
<select
  aria-label="Filter by status"
  value={filterStatus}
  ...
>
```
- File: [`src/app/projects/list-page.tsx`](src/app/projects/list-page.tsx), line 103

### A5. `color-contrast` on doc health badge — `src/app/projects/detail-page.tsx` line 219

`text-white` on `bg-yellow-500` (`#eab308`) = 1.91:1 — critically failing. White on yellow-500 is never sufficient.

**Fix:** Change `text-white` to `text-yellow-900` (dark text on yellow background) for the partial state only, or darken the background to `bg-yellow-600`/`bg-amber-600`. The cleanest fix is dark text on light badge:
- `bg-yellow-100 text-yellow-800` — gives ~8:1 contrast
- Or keep the circle but use `text-yellow-900` instead of `text-white`

- File: [`src/app/projects/detail-page.tsx`](src/app/projects/detail-page.tsx), lines 210-221

### A6. `heading-order` on project detail — `src/app/projects/detail-page.tsx`

An `<h3>` ("IRS Justification") appears before an `<h2>`, or a page-level heading jumps from `<h1>` directly to `<h3>`.

**Fix:** Change section headings from `<h3>` to `<h2>` in the detail page (or add an intermediate `<h2>` page title). The detail page heading is likely an `<h1>` (`project.title`), so subsection cards should use `<h2>` not `<h3>`.

- File: [`src/app/projects/detail-page.tsx`](src/app/projects/detail-page.tsx)

### A7. `heading-order` on new project form — `src/app/projects/new-project-attachments.tsx` line 70

`<h3 class="...">Attachments</h3>` jumps over `<h2>`.

**Fix:** Change `<h3>` to `<h2>` in [`src/app/projects/new-project-attachments.tsx`](src/app/projects/new-project-attachments.tsx) line 70, or in the parent form if there's a form heading structure.

### A8. `region` on landing page mobile hero — `src/app/landing/landing-page.tsx`

The `<span>Capital Improvements</span>` nav brand and the `sm:max-w-xl` hero div (containing `<h1>`) are inside a `<section>` that renders **before** the `<main aria-label="Sign in">`. A `<section>` without an accessible name is not a landmark, so its content is "outside landmarks".

**Fix:** Add `aria-label="Hero"` to the `<section>` in `MobileHeroBlock` — this makes it a named `section` landmark and satisfies the region rule.

- File: [`src/app/landing/landing-page.tsx`](src/app/landing/landing-page.tsx), line 40 (`<section className="...">`)

---

## Category B — Test infrastructure regressions

### B1. Landing page tests: "See a demo", "Sign in button", "desktop screenshot" — `e2e/landing.spec.ts`

These three tests look for elements at `/` but find nothing. This is likely the `aria-hidden="true"` we added to the desktop layout — the desktop `<div>` is hidden from AT, but these tests look for the desktop `h1` and buttons without a viewport restriction.

**Fix options:**
- **Preferred:** The tests that look for `.first()` on the heading/buttons should use `filter({ visible: true })` to target only the mobile (visible) copy, or be scoped to `getByTestId("landing-mobile-card")`.
- Check if the `aria-hidden` on the desktop block is making Playwright's `getByRole` miss the elements (Playwright's `getByRole` respects `aria-hidden`).

- File: [`e2e/landing.spec.ts`](e2e/landing.spec.ts), tests at lines 17, 27, 37, 70

### B2. Auth tests on webkit: A1 (timeout), A2, A5 — `e2e/auth.spec.ts`

These fail because the landing page sign-in button is not found (same root cause as B1 — `aria-hidden` on the desktop block hides the second button from Playwright's `getByRole`). The tests use `.first()` which should get the mobile button, but if the mobile block's button is also not findable, the test hangs.

**Fix:** Once B1 is resolved (landing page renders correctly), these should pass. If not, scope button selectors to `getByTestId("landing-mobile-card").getByRole("button", { name: /sign in/i })`.

- File: [`e2e/auth.spec.ts`](e2e/auth.spec.ts), lines 26, 47-49, 118-120, 173-175

### B3. Settings S4/S5 validation tests — `e2e/settings.spec.ts`

S4 expects `/include a house number and street name/i` but the actual error string is `"Include a house number and street name — e.g. 123 Main St."` which contains an em dash `—`. The test was passing before, so something changed. Check if the `keyExpiry` label change (we added `<label htmlFor="keyExpiry">`) inadvertently changed any other element IDs or broke the HTML form structure.

**Fix:** Re-check if S4/S5 were passing before the `keyExpiry` label change. If the form structure is unrelated, the failure may be a test ordering / state isolation issue. The test removes `required` from the input before submitting — if the submit button form association changed, the JS handler may not fire.

- File: [`e2e/settings.spec.ts`](e2e/settings.spec.ts), lines 104 and 125
- Source: [`src/app/settings/settings-page.tsx`](src/app/settings/settings-page.tsx)

---

## Execution order

1. Fix A4 (`select-name` on list-page) — 1 line change
2. Fix A2 + A1 (demo banner `role="banner"` + color-contrast) — 2 changes in `demo/layout.tsx`
3. Fix A3 (`page-has-heading-one` on dashboard) — add `<h1>` to dashboard
4. Fix A5 (doc health badge contrast) — change text color in `detail-page.tsx`
5. Fix A6 + A7 (heading order in detail + new project) — `<h3>` → `<h2>`
6. Fix A8 (landing mobile `<section>` region) — add `aria-label="Hero"` to `MobileHeroBlock`
7. Fix B1/B2 (landing/auth tests — `aria-hidden` breaking `.first()` selectors)
8. Investigate + fix B3 (settings S4/S5 validation)
9. Run full E2E suite to confirm
