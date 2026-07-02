import { describe, it, expect } from "vitest";
import { MockStorageDriver } from "@/services/mock-storage-driver";
import { type Project, type PropertyProfile } from "@/domain/schemas";

describe("MockStorageDriver attachments", () => {
  const baseProject: Project = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    title: "Test",
    completionDate: "2025-01-01",
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

  it("adds project with uploaded attachments", async () => {
    const driver = new MockStorageDriver({
      schemaVersion: 2,
      lastUpdated: "2025-01-01T00:00:00.000Z",
      summary: { totalCostBasisAdded: 0, totalDeductible: 0 },
      projects: [],
    });
    const file = new File(["pdf"], "receipt.pdf", { type: "application/pdf" });
    Object.defineProperty(file, "size", { value: 100 });

    const result = await driver.addProjectWithAttachments(baseProject, [file]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.projects[0]?.attachments).toHaveLength(1);
      expect(result.value.projects[0]?.attachments[0]?.filename).toBe("receipt.pdf");
    }
  });

  it("uploads and removes attachments on existing project", async () => {
    const driver = new MockStorageDriver({
      schemaVersion: 2,
      lastUpdated: "2025-01-01T00:00:00.000Z",
      summary: { totalCostBasisAdded: 0, totalDeductible: 0 },
      projects: [baseProject],
    });
    const file = new File(["pdf"], "invoice.pdf", { type: "application/pdf" });
    Object.defineProperty(file, "size", { value: 200 });

    const upload = await driver.uploadAttachment(baseProject.id, file);
    expect(upload.ok).toBe(true);

    const fileId = upload.ok ? upload.value.projects[0]?.attachments[0]?.fileId : null;
    expect(fileId).toBeTruthy();

    if (fileId != null) {
      const blob = await driver.getAttachmentBlob(baseProject.id, fileId);
      expect(blob.ok).toBe(true);

      const removed = await driver.removeAttachment(baseProject.id, fileId);
      expect(removed.ok).toBe(true);
      if (removed.ok) {
        expect(removed.value.projects[0]?.attachments).toHaveLength(0);
      }
    }
  });
});

describe("MockStorageDriver.saveProperty", () => {
  const emptyManifest = {
    schemaVersion: 2 as const,
    lastUpdated: "2025-01-01T00:00:00.000Z",
    summary: { totalCostBasisAdded: 0, totalDeductible: 0 },
    projects: [],
  };

  const profile: PropertyProfile = {
    address: "11507 Links Dr",
    city: "Reston",
    state: "VA",
    zip: "20190",
    propertyType: "primary_residence",
  };

  it("saves a new property profile and returns the updated manifest", async () => {
    // Arrange
    const driver = new MockStorageDriver(emptyManifest);

    // Act
    const result = await driver.saveProperty(profile);

    // Assert
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.property).toEqual(profile);
    }
  });

  it("overwrites an existing property profile", async () => {
    // Arrange
    const driver = new MockStorageDriver({ ...emptyManifest, property: profile });
    const updated: PropertyProfile = { ...profile, city: "Arlington", zip: "22201" };

    // Act
    const result = await driver.saveProperty(updated);

    // Assert
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.property?.city).toBe("Arlington");
      expect(result.value.property?.zip).toBe("22201");
    }
  });

  it("persists address2 when provided", async () => {
    // Arrange
    const driver = new MockStorageDriver(emptyManifest);
    const withUnit: PropertyProfile = { ...profile, address2: "Unit 4B" };

    // Act
    const result = await driver.saveProperty(withUnit);

    // Assert
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.property?.address2).toBe("Unit 4B");
    }
  });

  it("does not mutate existing projects when saving property", async () => {
    // Arrange
    const projectId = "123e4567-e89b-12d3-a456-426614174001";
    const project: import("@/domain/schemas").Project = {
      id: projectId,
      title: "Roof",
      completionDate: "2025-01-01",
      totalCost: 5000,
      taxTreatment: "capital_improvement",
      costBasisAdjustment: 5000,
      deductibleAmount: 0,
      irsJustification: "",
      confidence: 1,
      attachments: [],
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    };
    const driver = new MockStorageDriver({ ...emptyManifest, projects: [project] });

    // Act
    const result = await driver.saveProperty(profile);

    // Assert
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.projects).toHaveLength(1);
      expect(result.value.projects[0]?.id).toBe(projectId);
    }
  });
});
