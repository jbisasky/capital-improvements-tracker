import { type Result } from "@/domain/result";
import { ok, err } from "@/domain/result";
import { appError } from "@/domain/errors";
import { type Attachment, type Manifest, type Project } from "@/domain/schemas";
import { validateAttachmentFile } from "@/domain/attachment-validation";
import {
  type StorageDriver,
  type ManifestReadResult,
} from "@/services/storage-driver";
import { DEMO_MANIFEST } from "@/services/fixtures";
import {
  deleteMockBlob,
  getMockBlob,
  mockUploadFile,
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

export class MockStorageDriver implements StorageDriver {
  private manifest: Manifest;
  private etag: string;

  constructor(initial?: Manifest) {
    this.manifest = structuredClone(initial ?? DEMO_MANIFEST);
    this.etag = crypto.randomUUID();
    for (const p of this.manifest.projects) {
      for (const att of p.attachments) {
        if (getMockBlob(att.fileId) == null) {
          storeMockBlob(
            att.fileId,
            new Blob([`Demo placeholder: ${att.filename}`], { type: att.mimeType }),
          );
        }
      }
    }
  }

  readManifest(): Promise<Result<ManifestReadResult>> {
    return Promise.resolve(
      ok({ manifest: structuredClone(this.manifest), etag: this.etag }),
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
    const project = this.manifest.projects[index];
    if (project != null) {
      for (const att of project.attachments) {
        deleteMockBlob(att.fileId);
      }
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

  async uploadProjectAttachment(
    projectId: string,
    file: File,
  ): Promise<Result<Manifest>> {
    const projectResult = await this.getProject(projectId);
    if (!projectResult.ok) return projectResult;

    const project = projectResult.value;
    const validation = validateAttachmentFile(file, project.attachments.length);
    if (!validation.ok) return validation;

    const uploaded = await mockUploadFile(file);
    const attachment: Attachment = uploaded;

    const updated: Project = {
      ...project,
      attachments: [...project.attachments, attachment],
      updatedAt: new Date().toISOString(),
    };

    return this.updateProject(projectId, updated);
  }

  async removeProjectAttachment(
    projectId: string,
    fileId: string,
  ): Promise<Result<Manifest>> {
    const projectResult = await this.getProject(projectId);
    if (!projectResult.ok) return projectResult;

    const project = projectResult.value;
    if (!project.attachments.some((a) => a.fileId === fileId)) {
      return err(appError("DRIVE_NOT_FOUND", "Attachment not found"));
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
      return err(appError("DRIVE_NOT_FOUND", "Attachment file not found"));
    }

    return ok(blob);
  }

  async addProjectWithAttachments(
    project: Project,
    files: File[],
  ): Promise<Result<Manifest>> {
    const attachments: Attachment[] = [];

    for (const file of files) {
      const validation = validateAttachmentFile(file, attachments.length);
      if (!validation.ok) return validation;

      const uploaded = await mockUploadFile(file);
      attachments.push(uploaded);
    }

    return this.addProject({ ...project, attachments });
  }
}
