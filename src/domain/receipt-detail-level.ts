import { type Project, type ReceiptDetailLevel } from "@/domain/schemas";

export const RECEIPT_DETAIL_LABELS: Record<ReceiptDetailLevel, string> = {
  itemized: "Itemized — materials/labor visible",
  lump_sum: "Lump sum only",
  unclear: "Unclear from receipt",
};

/** UI label for the form field (maps to the three-way enum). */
export const RECEIPT_DETAIL_FIELD_LABEL = "Materials/itemization visible on receipt";

/** Documentation Health recommended-field label. */
export const RECEIPT_DETAIL_DOC_LABEL = "Itemized receipt details";

export function shouldRecommendReceiptDetail(project: Project): boolean {
  return (
    project.attachments.length > 0 && project.receiptDetailLevel !== "itemized"
  );
}

export function formatDocFieldLabel(field: string): string {
  if (field === "receiptDetailLevel") {
    return RECEIPT_DETAIL_DOC_LABEL;
  }
  return field;
}
