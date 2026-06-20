/**
 * Drive-backed StorageDriver — reads/writes manifest.json in appDataFolder.
 * Implements CAS via headRevisionId. See LLD §5 and §6.
 */

import { type Result, ok, err } from "@/domain/result";
import { appError } from "@/domain/errors";
import { ManifestSchema, type Manifest, type Project } from "@/domain/schemas";
import {
  type StorageDriver,
  type ManifestReadResult,
} from "@/services/storage-driver";
import { httpFetch } from "@/services/http";
import { validateAttachmentFile } from "@/domain/attachment-validation";
import { type Attachment } from "@/domain/schemas";
import {
  ensureAttachmentsFolder,
  uploadAttachmentResumable,
  fetchAttachmentBlob,
  deleteDriveFile,
} from "@/services/drive-attachment";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const MANIFEST_NAME = "manifest.json";
const MAX_BACKUPS = 5;

interface DriveFile {
  id: string;
  name: string;
  headRevisionId: string;
  modifiedTime: string;
  createdTime: string;
}

interface DriveFileList {
  files: DriveFile[];
}

function recomputeSummary(projects: Project[]): Manifest["summary"] {
  let totalCostBasisAdded = 0;
  let totalDeductible = 0;
  for (const p of projects) {
    totalCostBasisAdded += p.costBasisAdjustment;
    totalDeductible += p.deductibleAmount;
  }
  return { totalCostBasisAdded, totalDeductible };
}

function emptyManifest(): Manifest {
  return {
    schemaVersion: 2,
    lastUpdated: new Date().toISOString(),
    summary: { totalCostBasisAdded: 0, totalDeductible: 0 },
    projects: [],
  };
}

export class DriveStorageDriver implements StorageDriver {
  private fileId: string | null = null;
  private cachedRevisionId: string | null = null;
  private cachedManifest: Manifest | null = null;

  async readManifest(): Promise<Result<ManifestReadResult>> {
    // Locate manifest in appDataFolder
    const locateResult = await this.locateManifest();
    if (!locateResult.ok) return locateResult;

    const { fileId, revisionId } = locateResult.value;
    this.fileId = fileId;
    this.cachedRevisionId = revisionId;

    // Download content
    const downloadResult = await httpFetch<string>(
      `${DRIVE_API}/files/${fileId}?alt=media`,
    );
    if (!downloadResult.ok) return downloadResult;

    // Parse + validate
    const parseResult = this.parseManifest(downloadResult.value);
    if (!parseResult.ok) return parseResult;

    this.cachedManifest = parseResult.value;
    return ok({ manifest: parseResult.value, etag: revisionId });
  }

  async writeManifest(
    manifest: Manifest,
    etag: string,
  ): Promise<Result<ManifestReadResult>> {
    if (this.fileId == null) {
      return err(appError("DRIVE_NOT_FOUND", "Manifest file not found"));
    }

    // CAS check: re-read head revision
    const headResult = await this.getHeadRevision(this.fileId);
    if (!headResult.ok) return headResult;

    if (headResult.value !== etag) {
      return err(
        appError("DRIVE_CONFLICT", "Manifest was modified concurrently"),
      );
    }

    // Rotate backup before writing
    await this.rotateBackup(this.fileId);

    // Update manifest metadata
    const updated: Manifest = {
      ...manifest,
      lastUpdated: new Date().toISOString(),
      summary: recomputeSummary(manifest.projects),
    };

    // Write via PATCH upload
    const writeResult = await httpFetch<DriveFile>(
      `${DRIVE_UPLOAD_API}/files/${this.fileId}?uploadType=media`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      },
    );

    if (!writeResult.ok) return writeResult;

    const newRevisionId = writeResult.value.headRevisionId;
    this.cachedRevisionId = newRevisionId;
    this.cachedManifest = updated;

    return ok({ manifest: updated, etag: newRevisionId });
  }

  async addProject(project: Project): Promise<Result<Manifest>> {
    const readResult = await this.ensureLoaded();
    if (!readResult.ok) return readResult;

    const manifest = readResult.value.manifest;
    const existing = manifest.projects.find((p) => p.id === project.id);
    if (existing != null) {
      return err(
        appError("DRIVE_CONFLICT", `Project ${project.id} already exists`),
      );
    }

    const updated: Manifest = {
      ...manifest,
      projects: [...manifest.projects, project],
    };

    const writeResult = await this.writeManifest(updated, readResult.value.etag);
    if (!writeResult.ok) return writeResult;
    return ok(writeResult.value.manifest);
  }

  async updateProject(
    id: string,
    project: Project,
  ): Promise<Result<Manifest>> {
    const readResult = await this.ensureLoaded();
    if (!readResult.ok) return readResult;

    const manifest = readResult.value.manifest;
    const index = manifest.projects.findIndex((p) => p.id === id);
    if (index === -1) {
      return err(appError("DRIVE_NOT_FOUND", `Project ${id} not found`));
    }

    const newProjects = [...manifest.projects];
    newProjects[index] = project;
    const updated: Manifest = { ...manifest, projects: newProjects };

    const writeResult = await this.writeManifest(updated, readResult.value.etag);
    if (!writeResult.ok) return writeResult;
    return ok(writeResult.value.manifest);
  }

  async deleteProject(id: string): Promise<Result<Manifest>> {
    const readResult = await this.ensureLoaded();
    if (!readResult.ok) return readResult;

    const manifest = readResult.value.manifest;
    const index = manifest.projects.findIndex((p) => p.id === id);
    if (index === -1) {
      return err(appError("DRIVE_NOT_FOUND", `Project ${id} not found`));
    }

    const updated: Manifest = {
      ...manifest,
      projects: manifest.projects.filter((p) => p.id !== id),
    };

    const writeResult = await this.writeManifest(updated, readResult.value.etag);
    if (!writeResult.ok) return writeResult;
    return ok(writeResult.value.manifest);
  }

  async getProject(id: string): Promise<Result<Project>> {
    const readResult = await this.ensureLoaded();
    if (!readResult.ok) return readResult;

    const project = readResult.value.manifest.projects.find(
      (p) => p.id === id,
    );
    if (project == null) {
      return err(appError("DRIVE_NOT_FOUND", `Project ${id} not found`));
    }
    return ok(project);
  }

  async uploadProjectAttachment(
    projectId: string,
    file: File,
  ): Promise<Result<Manifest>> {
    const projectResult = await this.getProject(projectId);
    if (!projectResult.ok) return projectResult;

    const validation = validateAttachmentFile(
      file,
      projectResult.value.attachments.length,
    );
    if (!validation.ok) return validation;

    const uploadResult = await this.uploadFileForManifest(file);
    if (!uploadResult.ok) return uploadResult;

    const { attachment, manifest: folderManifest, etag } = uploadResult.value;
    const project = folderManifest.projects.find((p) => p.id === projectId);
    if (project == null) {
      return err(appError("DRIVE_NOT_FOUND", `Project ${projectId} not found`));
    }

    const updated: Project = {
      ...project,
      attachments: [...project.attachments, attachment],
      updatedAt: new Date().toISOString(),
    };

    const newProjects = folderManifest.projects.map((p) =>
      p.id === projectId ? updated : p,
    );
    const manifestToWrite: Manifest = { ...folderManifest, projects: newProjects };

    const writeResult = await this.writeManifest(manifestToWrite, etag);
    if (!writeResult.ok) return writeResult;
    return ok(writeResult.value.manifest);
  }

  async removeProjectAttachment(
    projectId: string,
    fileId: string,
  ): Promise<Result<Manifest>> {
    const readResult = await this.ensureLoaded();
    if (!readResult.ok) return readResult;

    const manifest = readResult.value.manifest;
    const project = manifest.projects.find((p) => p.id === projectId);
    if (project == null) {
      return err(appError("DRIVE_NOT_FOUND", `Project ${projectId} not found`));
    }
    if (!project.attachments.some((a) => a.fileId === fileId)) {
      return err(appError("DRIVE_NOT_FOUND", "Attachment not found"));
    }

    await deleteDriveFile(fileId);

    const updated: Project = {
      ...project,
      attachments: project.attachments.filter((a) => a.fileId !== fileId),
      updatedAt: new Date().toISOString(),
    };

    const newProjects = manifest.projects.map((p) =>
      p.id === projectId ? updated : p,
    );

    const writeResult = await this.writeManifest(
      { ...manifest, projects: newProjects },
      readResult.value.etag,
    );
    if (!writeResult.ok) return writeResult;
    return ok(writeResult.value.manifest);
  }

  async getAttachmentBlob(
    projectId: string,
    fileId: string,
  ): Promise<Result<Blob>> {
    const projectResult = await this.getProject(projectId);
    if (!projectResult.ok) return projectResult;

    if (!projectResult.value.attachments.some((a) => a.fileId === fileId)) {
      return err(appError("DRIVE_NOT_FOUND", "Attachment not found"));
    }

    return fetchAttachmentBlob(fileId);
  }

  async addProjectWithAttachments(
    project: Project,
    files: File[],
  ): Promise<Result<Manifest>> {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file == null) continue;
      const validation = validateAttachmentFile(file, i);
      if (!validation.ok) return validation;
    }

    const folderResult = await this.ensureAttachmentsFolderPersisted();
    if (!folderResult.ok) return folderResult;

    const attachments: Attachment[] = [];
    for (const file of files) {
      const uploadResult = await uploadAttachmentResumable(
        file,
        folderResult.value,
      );
      if (!uploadResult.ok) return uploadResult;
      attachments.push(uploadResult.value);
    }

    return this.addProject({ ...project, attachments });
  }

  // --- Private helpers ---

  private async ensureAttachmentsFolderPersisted(): Promise<Result<string>> {
    const readResult = await this.ensureLoaded();
    if (!readResult.ok) return readResult;

    let manifest = readResult.value.manifest;
    const etag = readResult.value.etag;

    const folderResult = await ensureAttachmentsFolder(manifest);
    if (!folderResult.ok) return folderResult;

    if (folderResult.value.manifestPatch != null) {
      manifest = {
        ...manifest,
        settings: {
          ...manifest.settings,
          ...folderResult.value.manifestPatch.settings,
        },
      };
      const settingsWrite = await this.writeManifest(manifest, etag);
      if (!settingsWrite.ok) return settingsWrite;
    }

    return ok(folderResult.value.folderId);
  }

  private async uploadFileForManifest(file: File): Promise<
    Result<{
      attachment: Attachment;
      manifest: Manifest;
      etag: string;
    }>
  > {
    const folderResult = await this.ensureAttachmentsFolderPersisted();
    if (!folderResult.ok) return folderResult;

    const uploadResult = await uploadAttachmentResumable(
      file,
      folderResult.value,
    );
    if (!uploadResult.ok) return uploadResult;

    const readResult = await this.ensureLoaded();
    if (!readResult.ok) return readResult;

    return ok({
      attachment: uploadResult.value,
      manifest: readResult.value.manifest,
      etag: readResult.value.etag,
    });
  }

  private async ensureLoaded(): Promise<Result<ManifestReadResult>> {
    if (this.cachedManifest != null && this.cachedRevisionId != null) {
      return ok({
        manifest: this.cachedManifest,
        etag: this.cachedRevisionId,
      });
    }
    return this.readManifest();
  }

  private async locateManifest(): Promise<
    Result<{ fileId: string; revisionId: string }>
  > {
    const query = `name = '${MANIFEST_NAME}' and trashed = false`;
    const fields = "files(id,name,headRevisionId,modifiedTime)";
    const url = `${DRIVE_API}/files?spaces=appDataFolder&q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}`;

    const result = await httpFetch<DriveFileList>(url);
    if (!result.ok) return result;

    const files = result.value.files;

    if (files.length === 0) {
      return this.createManifest();
    }

    // Pick the most recently modified if duplicates exist
    const sorted = [...files].sort(
      (a, b) =>
        new Date(b.modifiedTime).getTime() -
        new Date(a.modifiedTime).getTime(),
    );
    const file = sorted[0];
    if (file == null) {
      return this.createManifest();
    }
    return ok({ fileId: file.id, revisionId: file.headRevisionId });
  }

  private async createManifest(): Promise<
    Result<{ fileId: string; revisionId: string }>
  > {
    const manifest = emptyManifest();
    const metadata = {
      name: MANIFEST_NAME,
      parents: ["appDataFolder"],
      mimeType: "application/json",
    };

    const boundary = "manifest_boundary_" + crypto.randomUUID().slice(0, 8);
    const body = [
      `--${boundary}`,
      "Content-Type: application/json; charset=UTF-8",
      "",
      JSON.stringify(metadata),
      `--${boundary}`,
      "Content-Type: application/json",
      "",
      JSON.stringify(manifest),
      `--${boundary}--`,
    ].join("\r\n");

    const result = await httpFetch<DriveFile>(
      `${DRIVE_UPLOAD_API}/files?uploadType=multipart`,
      {
        method: "POST",
        headers: {
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      },
    );

    if (!result.ok) return result;
    return ok({
      fileId: result.value.id,
      revisionId: result.value.headRevisionId,
    });
  }

  private async getHeadRevision(fileId: string): Promise<Result<string>> {
    const result = await httpFetch<{ headRevisionId: string }>(
      `${DRIVE_API}/files/${fileId}?fields=headRevisionId`,
    );
    if (!result.ok) return result;
    return ok(result.value.headRevisionId);
  }

  private parseManifest(raw: unknown): Result<Manifest> {
    let parsed: unknown;
    if (typeof raw === "string") {
      try {
        parsed = JSON.parse(raw) as unknown;
      } catch {
        return err(appError("PARSE_ERROR", "Invalid JSON in manifest"));
      }
    } else {
      parsed = raw;
    }

    const result = ManifestSchema.safeParse(parsed);
    if (!result.success) {
      return err(
        appError(
          "VALIDATION_ERROR",
          `Manifest validation failed: ${result.error.message}`,
        ),
      );
    }
    return ok(result.data);
  }

  private async rotateBackup(fileId: string): Promise<void> {
    // List existing backups
    const query = `name contains 'manifest.bak.' and trashed = false`;
    const fields = "files(id,name,createdTime)";
    const url = `${DRIVE_API}/files?spaces=appDataFolder&q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}`;

    const listResult = await httpFetch<DriveFileList>(url);
    if (!listResult.ok) return; // best-effort

    // Copy current manifest to backup
    const backupName = `manifest.bak.${String(Date.now())}.json`;
    await httpFetch<DriveFile>(`${DRIVE_API}/files/${fileId}/copy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: backupName,
        parents: ["appDataFolder"],
      }),
    });

    // Delete old backups beyond MAX_BACKUPS
    const backups = listResult.value.files;
    if (backups.length >= MAX_BACKUPS) {
      const sorted = [...backups].sort(
        (a, b) =>
          new Date(a.createdTime).getTime() -
          new Date(b.createdTime).getTime(),
      );
      const toDelete = sorted.slice(0, backups.length - MAX_BACKUPS + 1);
      await Promise.all(
        toDelete.map((f) =>
          httpFetch<unknown>(`${DRIVE_API}/files/${f.id}`, {
            method: "DELETE",
          }),
        ),
      );
    }
  }
}
