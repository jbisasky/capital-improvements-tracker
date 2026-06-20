import { describe, it, expect } from "vitest";
import { mergeAllExtractions, mergeExtractionResults } from "./extraction-merge";
import { type ExtractionResult } from "./schemas";

describe("mergeExtractionResults", () => {
  const primary: ExtractionResult = {
    title: "New roof",
    completionDate: "2025-04-12",
    totalCost: 18000,
    suggestedTreatment: "capital_improvement",
    costBasisAdjustment: 18000,
    deductibleAmount: 0,
    irsJustification: "Full roof replacement",
    vendor: "ABC Roofing",
    confidence: 0.9,
    category: "roof",
    paymentMethod: null,
    permitNumber: null,
    receiptDetailLevel: "lump_sum",
  };

  const secondary: ExtractionResult = {
    title: "Permit fee",
    completionDate: null,
    totalCost: null,
    suggestedTreatment: "unknown",
    costBasisAdjustment: null,
    deductibleAmount: null,
    irsJustification: "",
    vendor: null,
    confidence: 0.7,
    category: null,
    paymentMethod: null,
    permitNumber: "BLD-2025-001",
    receiptDetailLevel: "itemized",
  };

  it("returns next when base is null", () => {
    expect(mergeExtractionResults(null, primary)).toEqual(primary);
  });

  it("fills gaps from a second extraction without overwriting primary fields", () => {
    const merged = mergeExtractionResults(primary, secondary);

    expect(merged.title).toBe("New roof");
    expect(merged.totalCost).toBe(18000);
    expect(merged.permitNumber).toBe("BLD-2025-001");
    expect(merged.receiptDetailLevel).toBe("itemized");
    expect(merged.confidence).toBe(0.7);
  });

  it("merges three extractions in order", () => {
    const merged = mergeAllExtractions([primary, secondary, primary]);

    expect(merged.title).toBe("New roof");
    expect(merged.permitNumber).toBe("BLD-2025-001");
    expect(merged.receiptDetailLevel).toBe("itemized");
  });
});
