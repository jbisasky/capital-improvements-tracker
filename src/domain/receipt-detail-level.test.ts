import { describe, it, expect } from "vitest";
import {
  shouldRecommendReceiptDetail,
  formatDocFieldLabel,
  RECEIPT_DETAIL_DOC_LABEL,
} from "./receipt-detail-level";
import { type Project } from "./schemas";

describe("receipt-detail-level", () => {
  const baseProject: Project = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    title: "Roof",
    completionDate: "2025-01-01",
    totalCost: 1000,
    taxTreatment: "capital_improvement",
    costBasisAdjustment: 1000,
    deductibleAmount: 0,
    irsJustification: "New roof",
    confidence: 1,
    attachments: [{ fileId: "1", filename: "r.pdf", mimeType: "application/pdf", sizeBytes: 1 }],
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  };

  it("recommends receipt detail when attachments exist but level is unset", () => {
    // Arrange (baseProject has attachment, no receiptDetailLevel)
    // Act
    const result = shouldRecommendReceiptDetail(baseProject);

    // Assert
    expect(result).toBe(true);
  });

  it("recommends receipt detail for lump_sum and unclear", () => {
    // Arrange
    const lumpSum = { ...baseProject, receiptDetailLevel: "lump_sum" as const };
    const unclear = { ...baseProject, receiptDetailLevel: "unclear" as const };

    // Act & Assert
    expect(shouldRecommendReceiptDetail(lumpSum)).toBe(true);
    expect(shouldRecommendReceiptDetail(unclear)).toBe(true);
  });

  it("does not recommend when itemized or no attachments", () => {
    // Arrange
    const itemized = { ...baseProject, receiptDetailLevel: "itemized" as const };
    const noAttachments = { ...baseProject, attachments: [] };

    // Act & Assert
    expect(shouldRecommendReceiptDetail(itemized)).toBe(false);
    expect(shouldRecommendReceiptDetail(noAttachments)).toBe(false);
  });

  it("formats receiptDetailLevel for documentation health UI", () => {
    // Act
    const label = formatDocFieldLabel("receiptDetailLevel");

    // Assert
    expect(label).toBe(RECEIPT_DETAIL_DOC_LABEL);
    expect(formatDocFieldLabel("vendorName")).toBe("vendorName");
  });
});
