# Lighthouse Improvement Plan

**Report date:** 2026-07-04  
**URL:** https://capital-improvements-tracker.pages.dev/  
**Scores:** Performance 74 · Accessibility 91 · Best Practices 92 · SEO 100

---

## Performance

### 1. Dynamic-import OpenTelemetry (Highest priority)

**Finding:** The entire OTel stack (~100 kB gzipped) is bundled in `index-rH3O2hVB.js` even when `VITE_HONEYCOMB_API_KEY` is unset. Lighthouse reports 385 KiB of unused JS (61% of the bundle) and estimates 1.95 s savings in LCP.

**Root cause:** `src/services/telemetry.ts` uses static top-level imports for all `@opentelemetry/*` packages. The runtime guard (`if (!apiKey) return`) prevents *execution* but not *bundling*.

**Fix:** Convert all OTel imports inside `initTelemetry()` to dynamic `await import(...)` calls. Vite will code-split them into a separate chunk that is only fetched when the API key is present.

```typescript
export async function initTelemetry(): Promise<void> {
  const apiKey = import.meta.env["VITE_HONEYCOMB_API_KEY"] as string | undefined;
  if (!apiKey || initialized) return;
  initialized = true;

  const [{ WebTracerProvider }, { BatchSpanProcessor }, ...] =
    await Promise.all([
      import("@opentelemetry/sdk-trace-web"),
      import("@opentelemetry/sdk-trace-base"),
      // ...
    ]);
  // rest of setup unchanged
}
```

**Expected gain:** ~100 kB removed from initial bundle, ~1.8–1.95 s FCP/LCP improvement on simulated mobile.

---

### 2. Bundle visualizer (Prerequisite for further analysis)

**Finding:** The exact composition of the 642 kB bundle is unknown beyond the OTel hypothesis.

**Fix:** Add `rollup-plugin-visualizer` as a dev dependency and wire it into `vite.config.ts` behind an env flag:

```typescript
import { visualizer } from 'rollup-plugin-visualizer';

// in plugins array, conditionally:
process.env.ANALYZE && visualizer({ open: true, gzipSize: true })
```

Run with `ANALYZE=1 npm run build` to confirm where bytes are going before and after the OTel split.

---

### 3. Disable unused OTel auto-instrumentations (Secondary)

**Finding:** `getWebAutoInstrumentations()` registers ~7 browser instrumenters. `instrumentation-xml-http-request` is already disabled, but `instrumentation-user-interaction` may not be needed.

**Fix:** After dynamic-importing OTel, audit which instrumentations are actually used in Honeycomb traces and disable the rest. Potential saving: 10–30 kB.

---

### 4. Verify PDF renderer is code-split (Confirm)

**Finding:** `@react-pdf/renderer` is a large dependency imported only on the Export page (`src/app/export/page.tsx`). If React Router is not lazy-loading this route, it is in the main bundle.

**Fix:** Confirm the export page is wrapped in `React.lazy()` / `React.Suspense` or that the router uses dynamic imports. If not, add:

```typescript
const ExportPage = lazy(() => import("./export/page"));
```

---

### 5. Pre-render landing page (Optional, fun experiment)

**Finding:** The landing page (`/`) is static content with no user-specific data. It could be pre-rendered at build time to avoid waiting for JavaScript to download, parse, and render.

**Why this matters:**
- SEO: Real HTML is always better for crawlers (though Google crawls JS now)
- First impression: Users see the landing page first; faster load = better UX
- Low maintenance: Only one page, not the entire app (authenticated pages remain client-side)

**Estimated gain:** ~500ms–1s faster FCP/LCP on slow networks, depending on current bundle size.

**Fix approach:**

1. Add `@vitejs/plugin-virtual-html` or use a simple build script to pre-render the landing page at build time using `renderToString`.
2. Update `vite.config.ts` to inject the pre-rendered HTML.
3. Ensure `LandingPage` doesn't rely on `useEffect` or dynamic hooks that break server-side rendering.

**Example setup:**

```typescript
// build-landing.js (run before Vite build)
import { renderToString } from "react-dom/server";
import { LandingPage } from "./src/app/landing/page.tsx";
import fs from "fs";
import path from "path";

const html = renderToString(<LandingPage />);
// Inject into dist/ or use a Vite plugin to modify index.html

fs.writeFileSync(path.join("dist", "landing-pre.html"), html);
```

**Caveats:**
- If `LandingPage` uses hooks that don't work in Node.js (e.g., `useEffect`, browser APIs), you'll need to conditionally skip them or refactor.
- Adds a build step; every landing page change requires a rebuild.
- Gains are marginal if the app is already fast (Cloudflare + Vite is already pretty snappy).

**Recommendation:** Fun to implement for learning, but not a priority. Only do this if Lighthouse shows landing page LCP > 2s or if SEO is critical.

---

## Accessibility

### 5. Footer contrast ratio (WCAG 2 AA violation)

**Finding:** axe-core reports the footer disclaimer text fails contrast at **4.39:1** (required: 4.5:1).

- Element: `<footer>` — "⚠ NOT TAX ADVICE — FOR RECORDKEEPING ONLY."
- Foreground: `#71717b` (zinc-500), Background: `#f4f4f5` (zinc-100), Font: 10px bold
- WCAG criterion: 1.4.3 (Level AA)

**Fix options (pick one):**
- Switch to `text-zinc-600` (`#52525b`) — contrast ~6.1:1 ✓
- Increase font size to ≥ 14px bold or ≥ 18px normal (large-text threshold of 3:1 would apply)
- Darken the background slightly

Note: The footer uses `force-light` wrapper so this is a light-mode-only issue. Dark mode may be fine.

---

### 6. Missing `<main>` landmark

**Finding:** Lighthouse/axe reports "Document does not have a main landmark." The page renders content inside generic `<div>` elements without a `<main role="main">` or `<main>` element.

**Fix:** Wrap the primary page content in each route's layout with a `<main>` element. In `src/components/layout/` (the root layout / app shell), identify the content slot `<div>` and replace it with `<main>`.

```tsx
// Before
<div className="flex-1 overflow-auto p-4">{children}</div>

// After
<main className="flex-1 overflow-auto p-4">{children}</main>
```

Screen reader users rely on this to skip to page content via the landmark navigation shortcut.

---

## Best Practices

### 7. CSP blocking the theme inline script (Console errors)

**Finding:** The Lighthouse `errors-in-console` audit found two identical CSP violations:

> Executing inline script violates the following Content Security Policy directive `'script-src 'self' https://plausible.io'`.  
> Either `'unsafe-inline'`, a hash (`sha256-kjTaNX1eoUbd0wjU4V18fTi+/z7dr205RKRVcet4BSM=`), or a nonce is required.

The blocking inline script is the theme-flash-prevention IIFE in `index.html` (line 23). Lighthouse has already computed its SHA-256 hash.

**Fix:** Add the script hash to the `script-src` directive in `public/_headers`:

```
script-src 'self' https://plausible.io 'sha256-kjTaNX1eoUbd0wjU4V18fTi+/z7dr205RKRVcet4BSM='
```

This is the safest option — no `'unsafe-inline'`, no nonce infrastructure needed, and the hash will only match this exact script content.

> ⚠️ If the inline script content ever changes, the hash must be recomputed.

**Side effect:** Fixing this also resolves the **"Issues were logged in the Issues panel"** finding (finding #8), which is caused by the same CSP violation.

---

### 8. Issues panel — CSP (Resolved by fix #7)

See finding #7 above.

---

### 9. Missing source maps

**Finding:** Lighthouse flags `index-rH3O2hVB.js` as a large first-party file without a source map. This limits Lighthouse's ability to attribute costs to specific modules and prevents production debugging in DevTools.

**Options:**
- **Generate hidden source maps:** Add `build.sourcemap: 'hidden'` to `vite.config.ts`. Maps are generated but not referenced in the JS file (no `//# sourceMappingURL`), so they won't be served to end users unless you explicitly upload them to an error-tracking service.
- **Skip for now:** This is a `score: 0` binary audit but carries zero performance weight. It is primarily a developer experience concern.

---

### 10. No structured data (Schema.org)

**Finding:** The Structured Data validator found no `application/ld+json` or microdata markup. The SEO score is already 100, so this is a "nice to have" for rich search results, not a blocker.

**Recommendation (optional):** Add a `WebApplication` or `WebSite` JSON-LD block to `index.html`. Example:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Capital Improvements Tracker",
  "url": "https://capital-improvements-tracker.pages.dev",
  "description": "Track home improvement projects and tax cost-basis adjustments.",
  "applicationCategory": "FinanceApplication"
}
</script>
```

---

## Execution Plan (Step-by-Step with Validation)

**Workflow:** Complete each step below in order. After each step:
1. Make code changes
2. Run unit tests (`npm run test`)
3. Run E2E tests (`npm run e2e`)
4. Run Lighthouse audit (`npm run build && npm run preview`)
5. Commit changes with clear message
6. Move to next step

---

## Priority Order

| Step | # | Finding | Category | Effort | Impact | Status |
|------|---|---------|----------|--------|--------|--------|
| 1 | 1 | Dynamic-import OTel | Performance | Medium | High — ~100 kB bundle reduction, ~2 s LCP | ⏳ Pending |
| 2 | 2 | CSP hash for inline script | Best Practices | Low | Eliminates console errors + Issues panel warnings | ⏳ Pending |
| 3 | 6 | Add `<main>` landmark | Accessibility | Low | Fixes axe violation, improves screen reader UX | ⏳ Pending |
| 4 | 5 | Footer contrast ratio | Accessibility | Low | Fixes WCAG 2 AA violation | ⏳ Pending |
| 5 | 3 | Disable unused OTel instrumentations | Performance | Low | 10–30 kB secondary reduction | ⏳ Pending |
| 6 | 4 | Verify PDF code-split | Performance | Low | Confirm / no-op | ⏳ Pending |
| 7 | 5a | Pre-render landing page | Performance | Low | ~500ms–1s FCP improvement (optional, fun experiment) | ⏳ Pending |
| 8 | 2 | Bundle visualizer | Performance | Low | Prerequisite for further analysis | ⏳ Pending |
| 9 | 9 | Source maps | Best Practices | Low | DX only, no user impact | ⏳ Pending |
| 10 | 10 | Structured data | SEO | Low | Optional rich results | ⏳ Pending |

---

## Validation Checklist Template

After completing each step, use this checklist before committing:

```
## Step [N]: [Finding Name]

### Tests
- [ ] Unit tests pass (`npm run test`)
- [ ] E2E tests pass (`npm run e2e`)

### Lighthouse Audit
- [ ] Performance score: ___ (previous: ___)
- [ ] Accessibility score: ___ (previous: ___)
- [ ] Best Practices score: ___ (previous: ___)
- [ ] SEO score: ___ (previous: ___)
- [ ] LCP: ___ ms (previous: ___ ms)
- [ ] CLS: ___ (previous: ___)

### No Regressions
- [ ] Bundle size impact: ___ kB (expected: ___)
- [ ] No console errors
- [ ] No new axe violations

### Commit
- Commit message: `[lighthouse] Step N: [Finding Name]`
- Push branch
```

---
