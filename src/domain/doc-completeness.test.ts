import { describe, it, expect } from "vitest";
import { assessDocumentation } from "./doc-completeness";
import { type Project } from "./schemas";

describe("doc-completeness", () => {
  const baseProject: Project = {
    id: "uuid-1",
    title: "Test Project",
    completionDate: "2025-01-01",
    totalCost: 1000,
    taxTreatment: "unknown",
    costBasisAdjustment: 0,
    deductibleAmount: 0,
    irsJustification: "",
    confidence: 1,
    attachments: [],
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  };

  it("evaluates an 'unknown' treatment project with only required base fields", () => {
    // Arrange (Project is already set as baseProject)
    // Act
    const result = assessDocumentation(baseProject, undefined);

    // Assert ('unknown' only requires title, completionDate, totalCost - all present in base)
    expect(result.status).toBe("complete");
    expect(result.missing).toEqual([]);
    expect(result.score).toBe(100);
  });

  it("evaluates a 'capital_improvement' with missing fields as 'incomplete' or 'partial'", () => {
    // Arrange
    const proj: Project = { ...baseProject, taxTreatment: "capital_improvement" };

    // Act
    const result = assessDocumentation(proj, undefined);

    // Assert (capital_improvement requires: title, date, cost, attachments, justification, vendorName)
    expect(result.missing).toContain("attachments");
    expect(result.missing).toContain("irsJustification");
    expect(result.missing).toContain("vendorName");
    // 3 out of 6 required -> 50% -> 'partial'
    expect(result.status).toBe("partial");
    expect(result.score).toBe(50);
  });

  it("evaluates a fully documented 'capital_improvement' as 'complete'", () => {
    // Arrange
    const proj: Project = {
      ...baseProject,
      taxTreatment: "capital_improvement",
      irsJustification: "New roof",
      vendorName: "Bob's Roofing",
      attachments: [{ fileId: "1", filename: "f", mimeType: "m", sizeBytes: 1 }],
      receiptDetailLevel: "itemized",
    };

    // Act
    const result = assessDocumentation(proj, undefined);

    // Assert
    expect(result.status).toBe("complete");
    expect(result.missing).toEqual([]);
    expect(result.score).toBe(100);
    // Should still recommend category, paymentMethod, permitNumber, notes
    expect(result.recommended).toContain("category");
    expect(result.recommended).not.toContain("receiptDetailLevel");
  });

  it("recommends receiptDetailLevel when attachments exist but not itemized", () => {
    // Arrange
    const proj: Project = {
      ...baseProject,
      taxTreatment: "capital_improvement",
      irsJustification: "New roof",
      vendorName: "Bob's Roofing",
      attachments: [{ fileId: "1", filename: "f", mimeType: "m", sizeBytes: 1 }],
      receiptDetailLevel: "lump_sum",
    };

    // Act
    const result = assessDocumentation(proj, undefined);

    // Assert
    expect(result.recommended).toContain("receiptDetailLevel");
  });

  it("does not recommend receiptDetailLevel without attachments", () => {
    // Arrange
    const proj: Project = {
      ...baseProject,
      taxTreatment: "unknown",
    };

    // Act
    const result = assessDocumentation(proj, undefined);

    // Assert
    expect(result.recommended).not.toContain("receiptDetailLevel");
  });

  it("adds rental modifiers for 'capital_improvement'", () => {
    // Arrange
    const proj: Project = { ...baseProject, taxTreatment: "capital_improvement" };

    // Act
    const result = assessDocumentation(proj, "rental");

    // Assert
    // Should now require usefulLifeYears and depreciationStartDate
    expect(result.missing).toContain("usefulLifeYears");
    expect(result.missing).toContain("depreciationStartDate");
    // Base required = 6, plus 2 = 8 total required. We have 3/8 -> <50% -> 'incomplete'
    expect(result.status).toBe("incomplete");
    expect(result.score).toBe(38);
  });

  it("adds home_office modifiers for any property with 'home_office'", () => {
    // Arrange
    const proj: Project = { ...baseProject, taxTreatment: "repair" };

    // Act
    const result = assessDocumentation(proj, "home_office");

    // Assert
    // Should require sqftAffected
    expect(result.missing).toContain("sqftAffected");
  });
});