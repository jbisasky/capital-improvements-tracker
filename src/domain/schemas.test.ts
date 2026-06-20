import { describe, it, expect } from "vitest";
import { ManifestSchema, ProjectSchema, ExtractionResultSchema } from "./schemas";

describe("domain schemas", () => {
  describe("ProjectSchema", () => {
    it("validates a complete valid project", () => {
      // Arrange
      const validProject = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        title: "New HVAC",
        completionDate: "2025-06-15",
        totalCost: 550000, // cents
        taxTreatment: "capital_improvement",
        costBasisAdjustment: 550000,
        deductibleAmount: 0,
        irsJustification: "Replaced 15 year old unit",
        confidence: 0.9,
        attachments: [
          { fileId: "file1", filename: "invoice.pdf", mimeType: "application/pdf", sizeBytes: 1024 }
        ],
        createdAt: "2025-06-16T10:00:00.000Z",
        updatedAt: "2025-06-16T10:00:00.000Z",
        category: "hvac",
        vendorTin: "12-3456789",
      };

      // Act
      const result = ProjectSchema.safeParse(validProject);

      // Assert
      expect(result.success).toBe(true);
    });

    it("rejects invalid UUID", () => {
      // Arrange
      const invalidProject = {
        id: "not-a-uuid",
        title: "Bad",
        completionDate: "2025-01-01",
        totalCost: 100,
        taxTreatment: "unknown",
        costBasisAdjustment: 0,
        deductibleAmount: 0,
        irsJustification: "",
        confidence: 1,
        attachments: [],
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      };

      // Act
      const result = ProjectSchema.safeParse(invalidProject);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].path).toEqual(["id"]);
      }
    });

    it("rejects negative costs", () => {
      // Arrange
      const invalidProject = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        title: "Bad",
        completionDate: "2025-01-01",
        totalCost: -100, // invalid
        taxTreatment: "unknown",
        costBasisAdjustment: 0,
        deductibleAmount: 0,
        irsJustification: "",
        confidence: 1,
        attachments: [],
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      };

      // Act
      const result = ProjectSchema.safeParse(invalidProject);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].path).toEqual(["totalCost"]);
      }
    });

    it("rejects invalid date format", () => {
      // Arrange
      const invalidProject = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        title: "Bad",
        completionDate: "01-01-2025", // should be YYYY-MM-DD
        totalCost: 100,
        taxTreatment: "unknown",
        costBasisAdjustment: 0,
        deductibleAmount: 0,
        irsJustification: "",
        confidence: 1,
        attachments: [],
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      };

      // Act
      const result = ProjectSchema.safeParse(invalidProject);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
         expect(result.error.issues[0].path).toEqual(["completionDate"]);
      }
    });

    it("accepts optional receiptDetailLevel", () => {
      // Arrange
      const validProject = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        title: "Roof",
        completionDate: "2025-01-01",
        totalCost: 1000,
        taxTreatment: "capital_improvement",
        costBasisAdjustment: 1000,
        deductibleAmount: 0,
        irsJustification: "New roof",
        confidence: 1,
        attachments: [],
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
        receiptDetailLevel: "itemized",
      };

      // Act
      const result = ProjectSchema.safeParse(validProject);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe("ManifestSchema", () => {
    it("validates a correct manifest", () => {
      // Arrange
      const validManifest = {
        schemaVersion: 2,
        lastUpdated: "2025-06-16T10:00:00.000Z",
        summary: {
          totalCostBasisAdded: 100,
          totalDeductible: 50,
        },
        projects: [],
      };

      // Act
      const result = ManifestSchema.safeParse(validManifest);

      // Assert
      expect(result.success).toBe(true);
    });

    it("rejects wrong schemaVersion", () => {
      // Arrange
      const invalidManifest = {
        schemaVersion: 1, // must be 2
        lastUpdated: "2025-06-16T10:00:00.000Z",
        summary: {
          totalCostBasisAdded: 100,
          totalDeductible: 50,
        },
        projects: [],
      };

      // Act
      const result = ManifestSchema.safeParse(invalidManifest);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe("ExtractionResultSchema", () => {
    it("allows nullable fields", () => {
      // Arrange
      const validExtraction = {
        title: "Extracted Title",
        completionDate: null,
        totalCost: null,
        suggestedTreatment: "unknown",
        costBasisAdjustment: null,
        deductibleAmount: null,
        irsJustification: "It looks like something",
        vendor: null,
        confidence: 0.5,
        receiptDetailLevel: "unclear",
      };

      // Act
      const result = ExtractionResultSchema.safeParse(validExtraction);

      // Assert
      expect(result.success).toBe(true);
    });
  });
});