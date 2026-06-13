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
}
