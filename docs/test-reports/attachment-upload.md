# Test Report: Attachment Upload Integration

**Date:** 2026-06-20  
**Scope:** Drive/mock attachment pipeline, shared `AttachmentSection`, new/detail/edit wiring.

## Unit tests (`npx vitest run`)

| Suite | Tests | Result |
|-------|------:|--------|
| `src/domain/attachment-validation.test.ts` | 5 | PASSED |
| `src/services/mock-storage-driver.test.ts` | 2 | PASSED |
| `src/services/drive-attachment.test.ts` | 1 | PASSED |
| `src/app/projects/attachment-section.test.tsx` | 2 | PASSED |
| Full suite (68 tests, 14 files) | 68 | PASSED |

## Typecheck & lint

- `npm run check` — PASSED

## Manual verification (recommended)

1. **Demo mode** (`/demo/projects/:id`) — upload file on detail; view/download; doc health improves.
2. **Signed-in** — create project from AI-scanned PDF; detail shows Attachments (1) with same filename.
3. **Detail upload** — add second attachment without opening Edit.
4. **Edit page** — attachment zone present and functional.

## E2E

Playwright not run in this session (browser binaries not installed in CI sandbox). Landing E2E unaffected.

## Implementation summary

- `attachment-validation.ts` — 25 MB, MIME whitelist, max 10/project
- `http-raw.ts` + `drive-attachment.ts` — resumable Drive upload, folder ensure, blob fetch
- `StorageDriver` extended; `MockStorageDriver` + `DriveStorageDriver` implemented
- `AttachmentSection` on new (pending), detail (live), edit (live)
- New project saves AI source file via `addProjectWithAttachments`
