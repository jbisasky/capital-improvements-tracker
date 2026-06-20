/**
 * Google Drive attachment upload, folder layout, and migration.
 * See LLD §7.
 */

import { type Result, ok, err } from "@/domain/result";
import { appError } from "@/domain/errors";
import {
  type Attachment,
  type Manifest,
  type Project,
} from "@/domain/schemas";
import { validateAttachmentFile } from "@/domain/attachment-validation";
import { projectFolderDisplayName } from "@/domain/drive-folder-name";
import { httpFetch } from "@/services/http";
import { httpRawFetch } from "@/services/http-raw";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
export const ATTACHMENTS_ROOT_FOLDER_NAME = "Capital Improvements (App Data)";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  parents?: string[];
  trashed?: boolean;
}

interface DriveFileList {
  files: DriveFile[];
}

interface ResumableUploadResult {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
}

function attachmentFromDriveFile(file: ResumableUploadResult, fallbackName: string): Attachment {
  return {
    fileId: file.id,
    filename: file.name || fallbackName,
    mimeType: file.mimeType,
    sizeBytes: file.size != null ? Number(file.size) : 0,
  };
}

async function findFolderByName(name: string): Promise<Result<string | null>> {
  const query = `name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const url = `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent("files(id)")}`;

  const result = await httpFetch<DriveFileList>(url);
  if (!result.ok) return result;

  const folder = result.value.files[0];
  return ok(folder?.id ?? null);
}

async function createFolder(
  name: string,
  parentId?: string,
): Promise<Result<string>> {
  const metadata: { name: string; mimeType: string; parents?: string[] } = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId != null) {
    metadata.parents = [parentId];
  }

  const result = await httpFetch<DriveFile>(`${DRIVE_API}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata),
  });

  if (!result.ok) return result;
  return ok(result.value.id);
}

async function verifyFolderExists(folderId: string): Promise<boolean> {
  const result = await httpFetch<DriveFile>(
    `${DRIVE_API}/files/${folderId}?fields=id,trashed,mimeType`,
  );
  if (!result.ok) return false;
  return (
    result.value.mimeType === "application/vnd.google-apps.folder" &&
    result.value.trashed !== true
  );
}

/** Ensure the root visible attachments folder exists; return its Drive folder id. */
export async function ensureAttachmentsRootFolder(
  manifest: Manifest,
): Promise<Result<{ folderId: string; manifest: Manifest }>> {
  const cachedId = manifest.settings?.attachmentsFolderId;
  if (cachedId != null && (await verifyFolderExists(cachedId))) {
    return ok({ folderId: cachedId, manifest });
  }

  const existing = await findFolderByName(ATTACHMENTS_ROOT_FOLDER_NAME);
  if (!existing.ok) return existing;

  let folderId = existing.value;
  if (folderId == null) {
    const created = await createFolder(ATTACHMENTS_ROOT_FOLDER_NAME);
    if (!created.ok) return created;
    folderId = created.value;
  }

  const updated: Manifest = {
    ...manifest,
    settings: {
      ...manifest.settings,
      attachmentsFolderId: folderId,
    },
  };

  return ok({ folderId, manifest: updated });
}

async function findProjectSubfolder(
  rootFolderId: string,
  folderName: string,
): Promise<Result<string | null>> {
  const query = `name = '${folderName.replace(/'/g, "\\'")}' and '${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const url = `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent("files(id)")}`;

  const result = await httpFetch<DriveFileList>(url);
  if (!result.ok) return result;

  return ok(result.value.files[0]?.id ?? null);
}

/** Ensure a per-project subfolder under the root attachments folder. */
export async function ensureProjectFolder(
  project: Project,
  rootFolderId: string,
): Promise<Result<{ folderId: string; project: Project }>> {
  if (project.projectFolderId != null && (await verifyFolderExists(project.projectFolderId))) {
    return ok({ folderId: project.projectFolderId, project });
  }

  const folderName = projectFolderDisplayName(project);
  const existing = await findProjectSubfolder(rootFolderId, folderName);
  if (!existing.ok) return existing;

  let folderId = existing.value;
  if (folderId == null) {
    const created = await createFolder(folderName, rootFolderId);
    if (!created.ok) return created;
    folderId = created.value;
  }

  return ok({
    folderId,
    project: { ...project, projectFolderId: folderId },
  });
}

async function getFileParents(fileId: string): Promise<Result<string[]>> {
  const result = await httpFetch<DriveFile>(
    `${DRIVE_API}/files/${fileId}?fields=parents`,
  );
  if (!result.ok) return result;
  return ok(result.value.parents ?? []);
}

async function moveFileToFolder(
  fileId: string,
  targetFolderId: string,
  removeParentId: string,
): Promise<Result<void>> {
  const result = await httpFetch<DriveFile>(`${DRIVE_API}/files/${fileId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      addParents: targetFolderId,
      removeParents: removeParentId,
    }),
  });

  if (!result.ok) return result;
  return ok(undefined);
}

/** Move manifest-referenced attachments from root into per-project subfolders. */
export async function migrateProjectsToSubfolders(
  manifest: Manifest,
  rootFolderId: string,
): Promise<Result<{ manifest: Manifest; changed: boolean }>> {
  let changed = false;
  const projects: Project[] = [];

  for (const project of manifest.projects) {
    if (project.attachments.length === 0) {
      projects.push(project);
      continue;
    }

    const folderResult = await ensureProjectFolder(project, rootFolderId);
    if (!folderResult.ok) return folderResult;

    const updatedProject = folderResult.value.project;
    if (updatedProject.projectFolderId !== project.projectFolderId) {
      changed = true;
    }

    const projectFolderId = folderResult.value.folderId;

    for (const attachment of project.attachments) {
      const parentsResult = await getFileParents(attachment.fileId);
      if (!parentsResult.ok) continue;

      if (
        parentsResult.value.includes(rootFolderId) &&
        !parentsResult.value.includes(projectFolderId)
      ) {
        const moveResult = await moveFileToFolder(
          attachment.fileId,
          projectFolderId,
          rootFolderId,
        );
        if (moveResult.ok) {
          changed = true;
        }
      }
    }

    projects.push(updatedProject);
  }

  if (!changed) {
    return ok({ manifest, changed: false });
  }

  return ok({
    manifest: { ...manifest, projects },
    changed: true,
  });
}

async function resumableUpload(
  file: File,
  parentFolderId: string,
): Promise<Result<ResumableUploadResult>> {
  const initResult = await httpRawFetch(
    `${DRIVE_UPLOAD_API}/files?uploadType=resumable`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": file.type || "application/octet-stream",
        "X-Upload-Content-Length": String(file.size),
      },
      body: JSON.stringify({
        name: file.name,
        parents: [parentFolderId],
      }),
    },
  );

  if (!initResult.ok) return initResult;

  const sessionUri = initResult.value.headers.get("Location");
  if (sessionUri == null) {
    return err(appError("NETWORK_ERROR", "Drive resumable upload did not return a session URI"));
  }

  const uploadResult = await httpRawFetch(sessionUri, {
    method: "PUT",
    headers: {
      "Content-Length": String(file.size),
      "Content-Range": `bytes 0-${String(file.size - 1)}/${String(file.size)}`,
    },
    body: file,
  });

  if (!uploadResult.ok) return uploadResult;

  if (!uploadResult.value.ok) {
    return err(
      appError(
        "NETWORK_ERROR",
        `Drive upload failed (HTTP ${String(uploadResult.value.status)})`,
      ),
    );
  }

  try {
    const parsed: unknown = JSON.parse(uploadResult.value.text);
    if (typeof parsed !== "object" || parsed == null || !("id" in parsed)) {
      return err(appError("PARSE_ERROR", "Drive upload response missing file id"));
    }
    const record = parsed as { id: unknown; name?: unknown; mimeType?: unknown; size?: unknown };
    if (typeof record.id !== "string") {
      return err(appError("PARSE_ERROR", "Drive upload response missing file id"));
    }
    const result: ResumableUploadResult = {
      id: record.id,
      name: typeof record.name === "string" ? record.name : "",
      mimeType: typeof record.mimeType === "string" ? record.mimeType : "application/octet-stream",
    };
    if (typeof record.size === "string") {
      result.size = record.size;
    }
    return ok(result);
  } catch {
    return err(appError("PARSE_ERROR", "Could not parse Drive upload response"));
  }
}

/** Resumable upload to a Drive folder (exported for unit tests). */
export async function uploadAttachmentResumable(
  file: File,
  parentFolderId: string,
): Promise<Result<ResumableUploadResult>> {
  return resumableUpload(file, parentFolderId);
}

export async function uploadFileToProjectFolder(
  file: File,
  project: Project,
  rootFolderId: string,
): Promise<Result<{ attachment: Attachment; project: Project }>> {
  const validation = validateAttachmentFile(file);
  if (!validation.ok) return validation;

  const folderResult = await ensureProjectFolder(project, rootFolderId);
  if (!folderResult.ok) return folderResult;

  const uploadResult = await resumableUpload(file, folderResult.value.folderId);
  if (!uploadResult.ok) return uploadResult;

  return ok({
    attachment: attachmentFromDriveFile(uploadResult.value, file.name),
    project: folderResult.value.project,
  });
}

export async function downloadDriveFile(fileId: string): Promise<Result<Blob>> {
  const result = await httpRawFetch(`${DRIVE_API}/files/${fileId}?alt=media`);
  if (!result.ok) return result;

  if (!result.value.ok) {
    return err(
      appError(
        "DRIVE_NOT_FOUND",
        `Could not download file (HTTP ${String(result.value.status)})`,
      ),
    );
  }

  const contentType =
    result.value.headers.get("Content-Type") ?? "application/octet-stream";
  const blob = new Blob([result.value.body ?? new ArrayBuffer(0)], {
    type: contentType,
  });
  return ok(blob);
}

export async function trashDriveFile(fileId: string): Promise<Result<void>> {
  const result = await httpFetch<unknown>(`${DRIVE_API}/files/${fileId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trashed: true }),
  });
  if (!result.ok) return result;
  return ok(undefined);
}

/** List files in the root attachments folder not referenced by any project. */
export async function listUnlinkedDriveFiles(
  manifest: Manifest,
  rootFolderId: string,
): Promise<Result<{ fileId: string; name: string }[]>> {
  const query = `'${rootFolderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`;
  const url = `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent("files(id,name)")}`;

  const result = await httpFetch<DriveFileList>(url);
  if (!result.ok) return result;

  const referenced = new Set<string>();
  for (const project of manifest.projects) {
    for (const attachment of project.attachments) {
      referenced.add(attachment.fileId);
    }
  }

  const unlinked = result.value.files
    .filter((file) => !referenced.has(file.id))
    .map((file) => ({ fileId: file.id, name: file.name }));

  return ok(unlinked);
}
