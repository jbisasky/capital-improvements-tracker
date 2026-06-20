import { describe, it, expect, vi, beforeEach } from "vitest";
import { ok, type Result } from "@/domain/result";
import type { ExtractionResult } from "@/domain/schemas";
import type { ExtractionResponse } from "./gemini";

const mockExtractFromDocument = vi.fn<
  (file: File) => Promise<Result<ExtractionResponse>>
>();
const mockExtractFromDocumentsCombined = vi.fn<
  (files: File[]) => Promise<Result<ExtractionResponse>>
>();

vi.mock("./gemini", () => ({
  extractFromDocument: (file: File) => mockExtractFromDocument(file),
  extractFromDocumentsCombined: (files: File[]) => mockExtractFromDocumentsCombined(files),
}));

import { extractProjectFromDocuments } from "./gemini-extraction-batch";

const sampleExtraction: ExtractionResult = {
  title: "Roof replacement",
  completionDate: "2024-06-01",
  totalCost: 12000,
  suggestedTreatment: "capital_improvement",
  costBasisAdjustment: 12000,
  deductibleAmount: 0,
  irsJustification: "Adds value and extends useful life.",
  vendor: "Acme Roofing",
  confidence: 0.9,
  category: "roof",
  paymentMethod: "check",
  permitNumber: null,
  receiptDetailLevel: "lump_sum",
};

const sampleResponse: ExtractionResponse = {
  result: sampleExtraction,
  tokensUsed: 10,
};

function makeFile(name: string): File {
  return new File(["receipt"], name, { type: "application/pdf" });
}

describe("extractProjectFromDocuments", () => {
  beforeEach(() => {
    mockExtractFromDocument.mockReset();
    mockExtractFromDocumentsCombined.mockReset();
    mockExtractFromDocument.mockResolvedValue(ok(sampleResponse));
    mockExtractFromDocumentsCombined.mockResolvedValue(ok(sampleResponse));
  });

  it("returns an error for no files", async () => {
    const result = await extractProjectFromDocuments([]);
    expect(result.ok).toBe(false);
  });

  it("uses single-file extraction for one document", async () => {
    const file = makeFile("a.pdf");
    const result = await extractProjectFromDocuments([file]);

    expect(mockExtractFromDocument).toHaveBeenCalledWith(file);
    expect(mockExtractFromDocumentsCombined).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });

  it("uses combined synthesis for multiple documents", async () => {
    const files = [makeFile("a.pdf"), makeFile("b.pdf")];
    const result = await extractProjectFromDocuments(files);

    expect(mockExtractFromDocumentsCombined).toHaveBeenCalledWith(files);
    expect(mockExtractFromDocument).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });
});
