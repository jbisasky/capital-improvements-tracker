import { type Result } from "@/domain/result";
import { type Manifest, type Project } from "@/domain/schemas";

export interface ManifestReadResult {
  manifest: Manifest;
  etag: string;
}

export interface UnlinkedDriveFile {
  fileId: string;
  name: string;
}

export interface StorageDriver {
  /** Read the manifest from storage. */
  readManifest(): Promise<Result<ManifestReadResult>>;

  /** Write the manifest to storage (CAS via etag). */
  writeManifest(manifest: Manifest, etag: string): Promise<Result<ManifestReadResult>>;

  /** Add a project to the manifest. */
  addProject(project: Project): Promise<Result<Manifest>>;

  /** Add a project with attachment files (upload first, manifest last). */
  addProjectWithAttachments(
    project: Project,
    files: File[],
  ): Promise<Result<Manifest>>;

  /** Update an existing project by ID. */
  updateProject(id: string, project: Project): Promise<Result<Manifest>>;

  /** Delete a project by ID. */
  deleteProject(id: string): Promise<Result<Manifest>>;

  /** Get a single project by ID. */
  getProject(id: string): Promise<Result<Project>>;

  /** Upload an attachment to an existing project. */
  uploadAttachment(projectId: string, file: File): Promise<Result<Manifest>>;

  /** Remove an attachment reference from a project (and trash the Drive file when supported). */
  removeAttachment(projectId: string, fileId: string): Promise<Result<Manifest>>;

  /** Download attachment bytes for view/download. */
  getAttachmentBlob(projectId: string, fileId: string): Promise<Result<Blob>>;

  /** Files in the root attachments folder not linked in the manifest (Drive only). */
  listUnlinkedDriveFiles(): Promise<Result<UnlinkedDriveFile[]>>;
}
