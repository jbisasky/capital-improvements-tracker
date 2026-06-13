import { type Result } from "@/domain/result";
import { ok, err } from "@/domain/result";
import { appError } from "@/domain/errors";
import { type Manifest, type Project } from "@/domain/schemas";
import {
  type StorageDriver,
  type ManifestReadResult,
} from "@/services/storage-driver";
import { DEMO_MANIFEST } from "@/services/fixtures";

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
}
