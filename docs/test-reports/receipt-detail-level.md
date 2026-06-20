# Test Report: Receipt detail level (`receiptDetailLevel`)

**Branch:** `materials`  
**Scope:** AI extraction, project schema, review UI, edit form, documentation health advisory.

## Unit tests (Vitest)

```bash
npx vitest run src/domain/receipt-detail-level.test.ts src/domain/doc-completeness.test.ts src/domain/schemas.test.ts
npm run typecheck
npm run lint
```

| Suite | Result |
| --- | --- |
| `receipt-detail-level.test.ts` (4 tests) | PASSED |
| `doc-completeness.test.ts` (receipt detail cases) | PASSED |
| `schemas.test.ts` (`ReceiptDetailLevel` on Project + ExtractionResult) | PASSED |
| Typecheck | PASSED |
| ESLint | PASSED |

## Behavior verified

- **`shouldRecommendReceiptDetail`:** recommends when attachments exist and level is unset, `lump_sum`, or `unclear`; skips when `itemized` or no attachments.
- **`assessDocumentation`:** adds `receiptDetailLevel` to recommended list per DOC-17; does not affect required score.
- **Schemas:** `Project.receiptDetailLevel` optional; `ExtractionResult.receiptDetailLevel` required from AI.

## Manual / E2E (not run in this session)

- AI extraction review shows *Materials/itemization visible on receipt* dropdown.
- Project detail shows receipt detail label and Documentation Health uses *Itemized receipt details*.
- Edit form allows manual override.

## Design docs updated

- `docs/high-level-design.md` §7.1
- `docs/low-level-design.md` §2, §10.2
- `docs/requirements-ears.md` AI-14, AI-15, DOC-17
- `docs/ui-ux-design.md` §5.5
