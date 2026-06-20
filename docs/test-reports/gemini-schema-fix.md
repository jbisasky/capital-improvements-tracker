# Test Report: Gemini extraction schema + error handling fix

**Date:** 2026-06-20  
**Scope:** Fix `response_schema` for Gemini API compatibility, URL-encode BYOK keys, and stop mislabeling non-key HTTP 400 errors.

## Root cause

Extraction requests used JSON Schema union syntax (`type: ["string", "null"]`, `null` in enums) that Gemini rejects with HTTP 400 `INVALID_ARGUMENT`. The app mapped **all** 400 responses to "Invalid API key" even when Test Key succeeded.

## Changes

- `EXTRACTION_SCHEMA`: single `type` strings + `nullable: true`; removed `null` from enums.
- `buildGenerateContentUrl`: `encodeURIComponent` on API keys (supports `AQ.` auth keys with `+`, `/`, `=`).
- `mapGeminiHttpError` / `readGeminiHttpError`: distinguish API-key errors from other 400s.

## Unit tests (`npx vitest run`)

| Test file | Result |
|-----------|--------|
| `src/services/gemini.test.ts` (13 tests) | **PASSED** |
| Full suite (58 tests, 10 files) | **PASSED** |

### New coverage in `gemini.test.ts`

- Schema uses no array `type` values and no `null` in enums
- URL encoding for special characters in keys
- `parseGeminiErrorMessage` parsing
- `mapGeminiHttpError` — API key vs schema rejection messages
- `extractFromDocument` — sends fixed schema; schema 400 does not blame the key
- `testGeminiKey` — URL-encodes keys

## E2E tests

**Not run** — Playwright browser binaries unavailable in the test environment (`npx playwright install` required). Extraction flow is covered by unit tests with mocked `fetch`.

## Manual verification (recommended)

1. Settings → confirm **Test Key** still passes.
2. Projects → Add New Project → upload PDF → **Extract details with AI**.
3. Expect extraction to proceed (or a non-key error if Gemini/model issues occur).
