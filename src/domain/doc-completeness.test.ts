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
    const result = assessDocumentation(baseProject, undefined);
    // 'unknown' only requires title, completionDate, totalCost (all present in base)
    expect(result.status).toBe("complete");
    expect(result.missing).toEqual([]);
    expect(result.score).toBe(100);
  });

  it("evaluates a 'capital_improvement' with missing fields as 'incomplete' or 'partial'", () => {
    const proj: Project = { ...baseProject, taxTreatment: "capital_improvement" };
    // capital_improvement requires: title, date, cost, attachments, justification, vendorName
    // we only have title, date, cost.
    const result = assessDocumentation(proj, undefined);
    expect(result.missing).toContain("attachments");
    expect(result.missing).toContain("irsJustification");
    expect(result.missing).toContain("vendorName");
    // 3 out of 6 required -> 50% -> 'partial'
    expect(result.status).toBe("partial");
    expect(result.score).toBe(50);
  });

  it("evaluates a fully documented 'capital_improvement' as 'complete'", () => {
    const proj: Project = {
      ...baseProject,
      taxTreatment: "capital_improvement",
      irsJustification: "New roof",
      vendorName: "Bob's Roofing",
      attachments: [{ fileId: "1", filename: "f", mimeType: "m", sizeBytes: 1 }],
    };
    const result = assessDocumentation(proj, undefined);
    expect(result.status).toBe("complete");
    expect(result.missing).toEqual([]);
    expect(result.score).toBe(100);
    // Should still recommend category, paymentMethod, permitNumber, notes
    expect(result.recommended).toContain("category");
  });

  it("adds rental modifiers for 'capital_improvement'", () => {
    const proj: Project = { ...baseProject, taxTreatment: "capital_improvement" };
    const result = assessDocumentation(proj, "rental");
    // Should now require usefulLifeYears and depreciationStartDate
    expect(result.missing).toContain("usefulLifeYears");
    expect(result.missing).toContain("depreciationStartDate");
    // Base required = 6, plus 2 = 8 total required. We have 3/8 -> <50% -> 'incomplete'
    expect(result.status).toBe("incomplete");
    expect(result.score).toBe(38);
  });

  it("adds home_office modifiers for any property with 'home_office'", () => {
    const proj: Project = { ...baseProject, taxTreatment: "repair" };
    const result = assessDocumentation(proj, "home_office");
    // Should require sqftAffected
    expect(result.missing).toContain("sqftAffected");
  });
});