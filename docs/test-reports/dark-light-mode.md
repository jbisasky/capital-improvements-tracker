# Test Report — Dark/Light/System Theme

**Date:** 2026-07-01
**Scope:** Light/Dark/System theme preference — `localStorage` persistence, Settings page control, sidebar quick toggle

---

## Summary

| Suite | Tests | Result |
|---|---|---|
| `services/theme.test.ts` | 12 | ✅ All pass |
| `services/theme-context.test.tsx` | 4 | ✅ All pass |
| `app/settings/page.test.tsx` — Appearance | 3 | ✅ All pass |
| `components/layout/app-shell.test.tsx` — theme toggle | 3 | ✅ All pass |
| Full vitest suite | 218 | ✅ All pass |
| `tsc -b --noEmit` | — | ✅ Clean |
| `eslint` (touched files) | — | ✅ No new errors (2 pre-existing unrelated errors in `settings/page.tsx`) |

---

## Design Decision: Storage Location

Theme preference is a **device-local display preference**, not domain/account data, so it's persisted to `localStorage` (key `theme_preference`) rather than the Drive-synced `manifest.json`. This mirrors the existing pattern used by the BYOK Gemini key (`gemini-key.ts`) and AI usage budget (`ai-budget.ts`).

---

## Changes Made

| File | Change |
|---|---|
| `src/services/theme.ts` (new) | Pure logic: `getThemePreference`/`saveThemePreference` (localStorage), `systemPrefersDark`, `resolveTheme`, `applyResolvedTheme` (toggles `.dark` on `<html>`) |
| `src/services/theme-context.tsx` (new) | `ThemeProvider` + `useTheme()` — tracks `preference` state and `systemDark` (updated only via the `matchMedia` "change" listener callback, per `react-hooks/set-state-in-effect`); `resolvedTheme` derived via `useMemo` |
| `index.html` | Inline pre-hydration script reads `theme_preference` from `localStorage` and applies `.dark` synchronously to avoid a flash of incorrect theme |
| `src/components/layout/root-layout.tsx` | Wrapped the route tree in `ThemeProvider` (outermost provider) |
| `src/app/settings/page.tsx` | New "Appearance" section — Light/Dark/System segmented `radiogroup` control |
| `src/components/layout/app-shell.tsx` | Theme icon button (Sun/Moon/Monitor) in both the desktop sidebar footer and mobile top bar; clicking cycles Light → Dark → System |

No CSS changes were needed — `src/index.css` already had full `.dark` variable support.

---

## Unit Tests

### `theme.ts` (12 tests)
- Defaults to `"system"` when unset; returns stored value; falls back to `"system"` on corrupted value.
- `saveThemePreference` persists to `localStorage`.
- `systemPrefersDark` reflects `matchMedia`.
- `resolveTheme` passes through `"light"`/`"dark"`; resolves `"system"` against the mocked OS preference.
- `applyResolvedTheme` adds/removes the `.dark` class.

### `theme-context.tsx` (4 tests)
- Defaults to `"system"`, resolves against the OS preference on mount.
- `setPreference` persists to `localStorage`, updates `resolvedTheme`, and applies `.dark`.
- Live OS theme change (simulated `matchMedia` "change" event) updates `resolvedTheme` while preference is `"system"`.
- `useTheme` throws outside a `ThemeProvider`.

### `settings/page.test.tsx` — Appearance (3 tests)
- Renders Light/Dark/System radio options.
- Marks the current preference as `aria-checked`.
- Clicking an option calls `setPreference` with the right value.

### `app-shell.test.tsx` — theme toggle (3 tests)
- Toggle button reflects the current preference (icon + accessible name).
- Desktop sidebar toggle cycles Light → Dark.
- Mobile top bar toggle cycles Dark → System.

---

## Full Suite

```
Test Files  36 passed (36)
     Tests  218 passed (218)
  Duration  3.48s
```

No regressions.

---

## Manual Verification (pending user check)

`npm run dev` server started and a browser preview was provided to the user; automated unit/type/lint checks above passed, but visual/manual confirmation of the following was not independently performed by the agent and should be spot-checked:
- Appearance section renders in `/settings` and `/demo/settings` with a working Light/Dark/System control.
- Sidebar and mobile top bar theme icon cycles correctly and the whole app repaints (backgrounds, cards, borders) per `.dark` CSS variables.
- Reloading the page after selecting Dark shows no flash of light theme (inline `index.html` script).
