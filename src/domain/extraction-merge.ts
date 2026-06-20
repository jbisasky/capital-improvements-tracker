import { type ExtractionResult, type ReceiptDetailLevel } from "@/domain/schemas";

function mergeReceiptDetailLevel(
  a: ReceiptDetailLevel,
  b: ReceiptDetailLevel,
): ReceiptDetailLevel {
  if (a === "itemized" || b === "itemized") return "itemized";
  if (a === "lump_sum" && b === "lump_sum") return "lump_sum";
  if (a === "unclear" && b === "unclear") return "unclear";
  if (a === "lump_sum" || b === "lump_sum") return "lump_sum";
  return "unclear";
}

function preferNonEmptyString(a: string, b: string): string {
  return a.length > 0 ? a : b;
}

function preferTreatment(
  a: ExtractionResult["suggestedTreatment"],
  b: ExtractionResult["suggestedTreatment"],
): ExtractionResult["suggestedTreatment"] {
  if (a !== "unknown") return a;
  return b;
}

/** Merge accepted extractions from multiple files (fill gaps; conservative confidence). */
export function mergeExtractionResults(
  base: ExtractionResult | null,
  next: ExtractionResult,
): ExtractionResult {
  if (base == null) return next;

  return {
    title: preferNonEmptyString(base.title, next.title),
    completionDate: base.completionDate ?? next.completionDate,
    totalCost: base.totalCost ?? next.totalCost,
    suggestedTreatment: preferTreatment(base.suggestedTreatment, next.suggestedTreatment),
    costBasisAdjustment: base.costBasisAdjustment ?? next.costBasisAdjustment,
    deductibleAmount: base.deductibleAmount ?? next.deductibleAmount,
    irsJustification: preferNonEmptyString(base.irsJustification, next.irsJustification),
    vendor: base.vendor ?? next.vendor,
    confidence: Math.min(base.confidence, next.confidence),
    category: base.category ?? next.category,
    paymentMethod: base.paymentMethod ?? next.paymentMethod,
    permitNumber: base.permitNumber ?? next.permitNumber,
    receiptDetailLevel: mergeReceiptDetailLevel(base.receiptDetailLevel, next.receiptDetailLevel),
  };
}

/** Fold multiple extractions into one gap-fill starting point for unified review. */
export function mergeAllExtractions(extractions: ExtractionResult[]): ExtractionResult {
  const [first, ...rest] = extractions;
  if (first == null) {
    throw new Error("mergeAllExtractions requires at least one extraction");
  }
  return rest.reduce(
    (merged, next) => mergeExtractionResults(merged, next),
    first,
  );
}
