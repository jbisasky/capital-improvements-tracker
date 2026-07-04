# Code Quality Improvements

**Last updated:** 2026-07-04

Tracks refactoring, naming, and structural improvements that don't affect runtime behavior but improve codebase consistency and maintainability.

---

## Execution Plan (Step-by-Step with Validation)

**Workflow:** Complete each step below in order. After each step:
1. Make code changes
2. Run unit tests (`npm run test`)
3. Run E2E tests (`npm run e2e`)
4. Verify app still builds and runs (`npm run build && npm run preview`)
5. Commit with a clear message
6. Move to next step

---

## Items

### 1. Standardize page file naming convention

**Finding:** Page files are inconsistently named across `src/app/`. Some use the generic `page.tsx` (borrowed from Next.js conventions), while others already use semantic names. Your app uses React Router v7 — file names have no routing significance, so naming should be semantic and consistent.

**Current state:**

```
src/app/
├── landing/
│   └── page.tsx                  ← generic (Next.js convention)
├── dashboard/
│   └── page.tsx                  ← generic
├── projects/
│   ├── list-page.tsx             ← semantic ✅
│   ├── detail-page.tsx           ← semantic ✅
│   ├── new-page.tsx              ← semantic ✅
│   └── edit-page.tsx             ← semantic ✅
├── settings/
│   ├── page.tsx                  ← generic
│   └── diagnostics-page.tsx      ← semantic ✅
├── export/
│   └── page.tsx                  ← generic
├── about/
│   └── page.tsx                  ← generic
└── auth/
    └── callback-page.tsx         ← semantic ✅
```

**Target state (rename generics to semantic names):**

```
src/app/
├── landing/
│   └── landing-page.tsx
├── dashboard/
│   └── dashboard-page.tsx
├── settings/
│   └── settings-page.tsx
├── export/
│   └── export-page.tsx
└── about/
    └── about-page.tsx
```

**Files to rename:**

| From | To |
|------|----|
| `src/app/landing/page.tsx` | `src/app/landing/landing-page.tsx` |
| `src/app/dashboard/page.tsx` | `src/app/dashboard/dashboard-page.tsx` |
| `src/app/settings/page.tsx` | `src/app/settings/settings-page.tsx` |
| `src/app/export/page.tsx` | `src/app/export/export-page.tsx` |
| `src/app/about/page.tsx` | `src/app/about/about-page.tsx` |

**Files to update after rename:**

- `src/app/router.tsx` — all import paths

**Why `{name}-page.tsx` over `{name}.tsx`:**
- Matches the existing semantic files in the repo (`list-page.tsx`, `detail-page.tsx`, etc.)
- Explicit "page" suffix distinguishes route-level components from sub-components
- Unambiguous in IDE tabs (no collision with `landing.tsx` style)

**Effort:** Low (rename + update imports, IDE refactoring handles most of it)
**Risk:** Low (no runtime behavior changes, just imports)
**Status:** ⏳ Pending

---

## Future Notes

These are not actionable yet — just things to keep in mind as the codebase grows.

### `usePrevious` → `src/hooks/use-previous.ts`

`usePrevious<T>()` is currently a private helper at the bottom of `src/services/auth-context.tsx`. It's generic and reusable, but only has one usage today so it stays put. If a second provider or component ever needs "previous value" tracking, extract it to `src/hooks/use-previous.ts` rather than duplicating it.

---

## Completed Items

*(None yet)*
