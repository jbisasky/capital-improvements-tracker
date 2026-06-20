import { type Result } from "@/domain/result";
import { type Manifest, type Project } from "@/domain/schemas";

export interface ManifestReadResult {
  manifest: Manifest;
  etag: string;
}

export interface StorageDriver {
  /** Read the manifest from storage. */
  readManifest(): Promise<Result<ManifestReadResult>>;

  /** Write the manifest to storage (CAS via etag). */
  writeManifest(manifest: Manifest, etag: string): Promise<Result<ManifestReadResult>>;

  /** Add a project to the manifest. */
  addProject(project: Project): Promise<Result<Manifest>>;

  /** Update an existing project by ID. */
  updateProject(id: string, project: Project): Promise<Result<Manifest>>;

  /** Delete a project by ID. */
  deleteProject(id: string): Promise<Result<Manifest>>;

  /** Get a single project by ID. */
  getProject(id: string): Promise<Result<Project>>;

  /** Upload a file and append attachment metadata to a project. */
  uploadProjectAttachment(projectId: string, file: File): Promise<Result<Manifest>>;

  /** Remove an attachment reference (and delete blob/file when supported). */
  removeProjectAttachment(projectId: string, fileId: string): Promise<Result<Manifest>>;

  /** Fetch attachment bytes for view/download. */
  getAttachmentBlob(projectId: string, fileId: string): Promise<Result<Blob>>;

  /** Upload files then add project — attachments-first, manifest-last (LLD §9). */
  addProjectWithAttachments(project: Project, files: File[]): Promise<Result<Manifest>>;
}
