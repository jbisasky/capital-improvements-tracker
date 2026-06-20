# Test Report: Drive folder organization & attachment upload

**Branch:** `materials`  
**Scope:** Attachment upload to Drive, per-project subfolders, manifest linkage, Settings/Diagnostics transparency.

## Unit tests (Vitest)

```bash
npx vitest run src/domain/attachment-validation.test.ts src/domain/drive-folder-name.test.ts src/services/mock-storage-driver.test.ts
npm run typecheck
npm run lint
```

| Suite | Result |
| --- | --- |
| `attachment-validation.test.ts` | PASSED |
| `drive-folder-name.test.ts` | PASSED |
| `mock-storage-driver.test.ts` | PASSED |
| Typecheck | PASSED |
| ESLint | PASSED |

## Behavior implemented

- **Manifest:** hidden `manifest.json` in `appDataFolder`; optional `settings.attachmentsFolderId`.
- **Attachments root:** `Capital Improvements (App Data)` created on first upload.
- **Per-project subfolders:** `{title} - {completionDate}/` with cached `projectFolderId`.
- **Migration on load:** moves manifest-referenced files from root into project subfolders.
- **UI:** `AttachmentSection` on detail/edit; AI source file uploaded on project create; Settings + Diagnostics explain storage layout and list unlinked root files.

## Manual / E2E (not run in this session)

- Sign in → create project with receipt → verify subfolder in Drive and attachment count in app.
- Reload app → project and attachments persist via manifest.
- Diagnostics shows unlinked files if any remain in root folder.

## Design docs updated

- `docs/high-level-design.md` §4.1
- `docs/low-level-design.md` §7.1.1, schema snippets
- `docs/requirements-ears.md` ATT-12–15
- `docs/ui-ux-design.md` export note
