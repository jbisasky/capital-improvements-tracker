# Test Report — Save Property Fix

**Date:** 2026-06-28  
**Scope:** Settings page property form — `saveProperty` implementation, `address2` field, required-field validation

---

## Summary

| Suite | Tests | Result |
|---|---|---|
| `mock-storage-driver.test.ts` — `saveProperty` | 4 | ✅ All pass |
| `settings/page.test.tsx` — property form | 7 | ✅ All pass |
| Full vitest suite | 194 | ✅ All pass |

---

## Root Causes Fixed

1. **Save button did nothing** — `handleSaveProperty` was a stub with only `e.preventDefault()`. No call to any storage method.
2. **Blank on return** — `useState` initialised once at mount; if the Drive manifest hadn't loaded yet, fields started empty and were never synced. Fixed with a `useEffect` watching `manifest?.property`.
3. **`saveProperty` not implemented** — the method was missing from `StorageDriver`, `MockStorageDriver`, `DriveStorageDriver`, and `StorageContext`.

---

## Changes Made

| File | Change |
|---|---|
| `src/domain/schemas.ts` | Added `address2: z.string().optional()` to `PropertyProfileSchema` |
| `src/services/storage-driver.ts` | Added `saveProperty(property: PropertyProfile): Promise<Result<Manifest>>` to interface |
| `src/services/mock-storage-driver.ts` | Implemented `saveProperty` — merges property into manifest, bumps etag |
| `src/services/drive-storage-driver.ts` | Implemented `saveProperty` — `ensureLoaded` → patch property → `writeManifest` |
| `src/services/storage-context.tsx` | Added `saveProperty` to context interface and `useCallback` implementation with `guardWrite` |
| `src/app/settings/page.tsx` | Wired `handleSaveProperty` to context; added `useEffect` sync; added `address2` field; added `required` attrs + JS guard; added save state feedback (Saving… / Saved ✓ / error) |

---

## Unit Tests

### `MockStorageDriver.saveProperty` (4 tests)

- **saves a new property profile** — verifies `result.value.property` equals the input
- **overwrites an existing property profile** — city/zip update without creating duplicates
- **persists address2 when provided** — optional field survives round-trip
- **does not mutate existing projects** — projects array unchanged after property save

### `SettingsPage — property form` (7 tests)

- **renders pre-filled fields from the manifest** — address/city/state/zip populated via `useEffect`
- **renders the optional Address 2 field** — input is present in the DOM
- **calls saveProperty with trimmed values on submit** — whitespace stripped before save
- **shows 'Saved ✓' after a successful save** — button label transitions on success
- **shows an error message when saveProperty returns err** — error text rendered inline
- **shows validation error if required fields are empty** — guard fires before driver call
- **includes address2 in the payload when filled** — optional field forwarded correctly

---

## Full Suite

```
Test Files  34 passed (34)
     Tests  194 passed (194)
  Duration  2.97s
```

No regressions.
