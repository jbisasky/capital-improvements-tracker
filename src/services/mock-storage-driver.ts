import { type Result } from "@/domain/result";
import { ok, err } from "@/domain/result";
import { appError } from "@/domain/errors";
import { type Attachment, type Manifest, type Project } from "@/domain/schemas";
import { MAX_ATTACHMENTS_PER_PROJECT, validateAttachmentFile } from "@/domain/attachment-validation";
import {
  type StorageDriver,
  type ManifestReadResult,
  type UnlinkedDriveFile,
} from "@/services/storage-driver";
import { DEMO_MANIFEST } from "@/services/fixtures";
import {
  deleteMockBlob,
  getMockBlob,
  storeMockBlob,
} from "@/services/mock-blob-store";

function recomputeSummary(projects: Project[]): Manifest["summary"] {
  let totalCostBasisAdded = 0;
  let totalDeductible = 0;
  for (const p of projects) {
    totalCostBasisAdded += p.costBasisAdjustment;
    totalDeductible += p.deductibleAmount;
  }
  return { totalCostBasisAdded, totalDeductible };
}

function mockAttachmentFromFile(file: File): Attachment {
  const fileId = crypto.randomUUID();
  storeMockBlob(fileId, file);
  return {
    fileId,
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  };
}

export class MockStorageDriver implements StorageDriver {
  private manifest: Manifest;
  private etag: string;

  constructor(initial?: Manifest) {
    this.manifest = structuredClone(initial ?? DEMO_MANIFEST);
    this.etag = crypto.randomUUID();
  }

  readManifest(): Promise<Result<ManifestReadResult>> {
    // Small delay so the skeleton loading state is visible in the demo.
    return new Promise((resolve) =>
      setTimeout(
        () => resolve(ok({ manifest: structuredClone(this.manifest), etag: this.etag })),
        300,
      ),
    );
  }

  writeManifest(
    manifest: Manifest,
    etag: string,
  ): Promise<Result<ManifestReadResult>> {
    if (etag !== this.etag) {
      return Promise.resolve(
        err(
          appError("DRIVE_CONFLICT", "ETag mismatch — manifest was modified concurrently"),
        ),
      );
    }
    this.manifest = structuredClone(manifest);
    this.manifest.lastUpdated = new Date().toISOString();
    this.manifest.summary = recomputeSummary(this.manifest.projects);
    this.etag = crypto.randomUUID();
    return Promise.resolve(
      ok({ manifest: structuredClone(this.manifest), etag: this.etag }),
    );
  }

  addProject(project: Project): Promise<Result<Manifest>> {
    const existing = this.manifest.projects.find((p) => p.id === project.id);
    if (existing) {
      return Promise.resolve(
        err(appError("DRIVE_CONFLICT", `Project ${project.id} already exists`)),
      );
    }
    this.manifest.projects.push(structuredClone(project));
    this.manifest.lastUpdated = new Date().toISOString();
    this.manifest.summary = recomputeSummary(this.manifest.projects);
    this.etag = crypto.randomUUID();
    return Promise.resolve(ok(structuredClone(this.manifest)));
  }

  addProjectWithAttachments(
    project: Project,
    files: File[],
  ): Promise<Result<Manifest>> {
    if (project.attachments.length + files.length > MAX_ATTACHMENTS_PER_PROJECT) {
      return Promise.resolve(
        err(
          appError(
            "VALIDATION_ERROR",
            `Maximum ${String(MAX_ATTACHMENTS_PER_PROJECT)} attachments per project.`,
          ),
        ),
      );
    }

    const attachments: Attachment[] = [...project.attachments];
    for (const file of files) {
      const validation = validateAttachmentFile(file);
      if (!validation.ok) {
        return Promise.resolve(validation);
      }
      attachments.push(mockAttachmentFromFile(file));
    }

    const withAttachments: Project = {
      ...project,
      attachments,
    };

    return this.addProject(withAttachments);
  }

  updateProject(id: string, project: Project): Promise<Result<Manifest>> {
    const index = this.manifest.projects.findIndex((p) => p.id === id);
    if (index === -1) {
      return Promise.resolve(
        err(appError("DRIVE_NOT_FOUND", `Project ${id} not found`)),
      );
    }
    this.manifest.projects[index] = structuredClone(project);
    this.manifest.lastUpdated = new Date().toISOString();
    this.manifest.summary = recomputeSummary(this.manifest.projects);
    this.etag = crypto.randomUUID();
    return Promise.resolve(ok(structuredClone(this.manifest)));
  }

  deleteProject(id: string): Promise<Result<Manifest>> {
    const index = this.manifest.projects.findIndex((p) => p.id === id);
    if (index === -1) {
      return Promise.resolve(
        err(appError("DRIVE_NOT_FOUND", `Project ${id} not found`)),
      );
    }
    this.manifest.projects.splice(index, 1);
    this.manifest.lastUpdated = new Date().toISOString();
    this.manifest.summary = recomputeSummary(this.manifest.projects);
    this.etag = crypto.randomUUID();
    return Promise.resolve(ok(structuredClone(this.manifest)));
  }

  getProject(id: string): Promise<Result<Project>> {
    const project = this.manifest.projects.find((p) => p.id === id);
    if (!project) {
      return Promise.resolve(
        err(appError("DRIVE_NOT_FOUND", `Project ${id} not found`)),
      );
    }
    return Promise.resolve(ok(structuredClone(project)));
  }

  uploadAttachment(projectId: string, file: File): Promise<Result<Manifest>> {
    const validation = validateAttachmentFile(file);
    if (!validation.ok) {
      return Promise.resolve(validation);
    }

    const index = this.manifest.projects.findIndex((p) => p.id === projectId);
    if (index === -1) {
      return Promise.resolve(
        err(appError("DRIVE_NOT_FOUND", `Project ${projectId} not found`)),
      );
    }

    const project = this.manifest.projects[index];
    if (project == null) {
      return Promise.resolve(
        err(appError("DRIVE_NOT_FOUND", `Project ${projectId} not found`)),
      );
    }

    if (project.attachments.length >= MAX_ATTACHMENTS_PER_PROJECT) {
      return Promise.resolve(
        err(
          appError(
            "VALIDATION_ERROR",
            `Maximum ${String(MAX_ATTACHMENTS_PER_PROJECT)} attachments per project.`,
          ),
        ),
      );
    }

    const updated: Project = {
      ...project,
      attachments: [...project.attachments, mockAttachmentFromFile(file)],
      updatedAt: new Date().toISOString(),
    };

    return this.updateProject(projectId, updated);
  }

  removeAttachment(projectId: string, fileId: string): Promise<Result<Manifest>> {
    const index = this.manifest.projects.findIndex((p) => p.id === projectId);
    if (index === -1) {
      return Promise.resolve(
        err(appError("DRIVE_NOT_FOUND", `Project ${projectId} not found`)),
      );
    }

    const project = this.manifest.projects[index];
    if (project == null) {
      return Promise.resolve(
        err(appError("DRIVE_NOT_FOUND", `Project ${projectId} not found`)),
      );
    }

    if (!project.attachments.some((a) => a.fileId === fileId)) {
      return Promise.resolve(
        err(appError("DRIVE_NOT_FOUND", "Attachment not found on project")),
      );
    }

    deleteMockBlob(fileId);

    const updated: Project = {
      ...project,
      attachments: project.attachments.filter((a) => a.fileId !== fileId),
      updatedAt: new Date().toISOString(),
    };

    return this.updateProject(projectId, updated);
  }

  async getAttachmentBlob(
    projectId: string,
    fileId: string,
  ): Promise<Result<Blob>> {
    const projectResult = await this.getProject(projectId);
    if (!projectResult.ok) return projectResult;

    const project = projectResult.value;
    if (!project.attachments.some((a) => a.fileId === fileId)) {
      return err(appError("DRIVE_NOT_FOUND", "Attachment not found"));
    }

    const blob = getMockBlob(fileId);
    if (blob == null) {
      return Promise.resolve(
        err(appError("DRIVE_NOT_FOUND", "Attachment file not found")),
      );
    }
    return Promise.resolve(ok(blob));
  }

  listUnlinkedDriveFiles(): Promise<Result<UnlinkedDriveFile[]>> {
    return Promise.resolve(ok([]));
  }
}
