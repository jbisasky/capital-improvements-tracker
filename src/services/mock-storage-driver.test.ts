import { describe, it, expect, beforeEach } from "vitest";
import { MockStorageDriver } from "./mock-storage-driver";
import { clearMockBlobStore, getMockBlob } from "./mock-blob-store";

describe("MockStorageDriver attachments", () => {
  beforeEach(() => {
    clearMockBlobStore();
  });

  it("uploads and retrieves attachment blobs", async () => {
    const driver = new MockStorageDriver({
      schemaVersion: 2,
      lastUpdated: new Date().toISOString(),
      summary: { totalCostBasisAdded: 0, totalDeductible: 0 },
      projects: [{
        id: "550e8400-e29b-41d4-a716-446655440099",
        title: "Test",
        completionDate: "2024-01-01",
        totalCost: 100,
        taxTreatment: "capital_improvement",
        costBasisAdjustment: 100,
        deductibleAmount: 0,
        irsJustification: "Test",
        confidence: 1,
        attachments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }],
    });

    const projectId = "550e8400-e29b-41d4-a716-446655440099";
    const file = new File(["receipt"], "receipt.pdf", { type: "application/pdf" });

    const uploadResult = await driver.uploadProjectAttachment(projectId, file);
    expect(uploadResult.ok).toBe(true);

    if (!uploadResult.ok) return;
    const project = uploadResult.value.projects[0];
    expect(project?.attachments).toHaveLength(1);

    const fileId = project?.attachments[0]?.fileId;
    expect(fileId).toBeDefined();
    if (fileId == null) return;

    const blobResult = await driver.getAttachmentBlob(projectId, fileId);
    expect(blobResult.ok).toBe(true);
    expect(getMockBlob(fileId)).toBeDefined();
  });

  it("addProjectWithAttachments uploads all files before adding project", async () => {
    const driver = new MockStorageDriver({
      schemaVersion: 2,
      lastUpdated: new Date().toISOString(),
      summary: { totalCostBasisAdded: 0, totalDeductible: 0 },
      projects: [],
    });

    const projectId = "550e8400-e29b-41d4-a716-446655440098";
    const now = new Date().toISOString();
    const file = new File(["x"], "invoice.pdf", { type: "application/pdf" });

    const result = await driver.addProjectWithAttachments(
      {
        id: projectId,
        title: "Roof",
        completionDate: "2024-06-01",
        totalCost: 5000,
        taxTreatment: "capital_improvement",
        costBasisAdjustment: 5000,
        deductibleAmount: 0,
        irsJustification: "Replacement",
        confidence: 1,
        attachments: [],
        createdAt: now,
        updatedAt: now,
      },
      [file],
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.projects[0]?.attachments).toHaveLength(1);
    expect(result.value.projects[0]?.attachments[0]?.filename).toBe("invoice.pdf");
  });
});
