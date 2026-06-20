/**
 * Drive attachment upload/download — resumable protocol. See LLD §7.
 */

import { type Result, ok, err } from "@/domain/result";
import { appError } from "@/domain/errors";
import { type Attachment, type Manifest } from "@/domain/schemas";
import { httpFetch } from "@/services/http";
import { httpFetchRaw } from "@/services/http-raw";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const ATTACHMENTS_FOLDER_NAME = "Capital Improvements (App Data)";
const CHUNK_SIZE = 8 * 1024 * 1024;

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  trashed?: boolean;
}

interface DriveFileList {
  files: DriveFile[];
}

export interface EnsureFolderResult {
  folderId: string;
  manifestPatch: Pick<Manifest, "settings"> | null;
}

/** Look up or create the user-visible attachments folder. */
export async function ensureAttachmentsFolder(
  manifest: Manifest,
): Promise<Result<EnsureFolderResult>> {
  const cached = manifest.settings?.attachmentsFolderId;
  if (cached != null && cached.length > 0) {
    const verify = await httpFetch<DriveFile>(
      `${DRIVE_API}/files/${cached}?fields=id,trashed`,
    );
    if (verify.ok && verify.value.trashed !== true) {
      return ok({ folderId: cached, manifestPatch: null });
    }
  }

  const query = `name = '${ATTACHMENTS_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const searchUrl = `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent("files(id,name)")}`;
  const searchResult = await httpFetch<DriveFileList>(searchUrl);
  if (!searchResult.ok) return searchResult;

  let folderId: string;
  if (searchResult.value.files.length > 0) {
    const first = searchResult.value.files[0];
    if (first == null) {
      return err(appError("DRIVE_NOT_FOUND", "Attachments folder not found"));
    }
    folderId = first.id;
  } else {
    const createResult = await httpFetch<DriveFile>(`${DRIVE_API}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: ATTACHMENTS_FOLDER_NAME,
        mimeType: "application/vnd.google-apps.folder",
      }),
    });
    if (!createResult.ok) return createResult;
    folderId = createResult.value.id;
  }

  const manifestPatch =
    cached === folderId
      ? null
      : { settings: { attachmentsFolderId: folderId } };

  return ok({ folderId, manifestPatch });
}

/** Upload a file via Drive resumable upload. */
export async function uploadAttachmentResumable(
  file: File,
  folderId: string,
): Promise<Result<Attachment>> {
  const initResult = await httpFetchRaw(
    `${DRIVE_UPLOAD_API}/files?uploadType=resumable`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Upload-Content-Type": file.type,
        "X-Upload-Content-Length": String(file.size),
      },
      body: JSON.stringify({
        name: file.name,
        parents: [folderId],
      }),
    },
  );
  if (!initResult.ok) return initResult;

  const initResponse = initResult.value;
  if (initResponse.status < 200 || initResponse.status >= 300) {
    const text = await initResponse.text().catch(() => "");
    return err(
      appError("WRITE_FAILED", `Upload handshake failed: ${text}`),
    );
  }

  const sessionUri = initResponse.headers.get("Location");
  if (sessionUri == null) {
    return err(appError("WRITE_FAILED", "Upload session URI missing"));
  }

  const buffer = await file.arrayBuffer();
  let offset = 0;

  while (offset < buffer.byteLength) {
    const end = Math.min(offset + CHUNK_SIZE, buffer.byteLength) - 1;
    const chunk = buffer.slice(offset, end + 1);

    const uploadResult = await httpFetchRaw(sessionUri, {
      method: "PUT",
      headers: {
        "Content-Length": String(chunk.byteLength),
        "Content-Range": `bytes ${String(offset)}-${String(end)}/${String(buffer.byteLength)}`,
      },
      body: chunk,
    });
    if (!uploadResult.ok) return uploadResult;

    const uploadResponse = uploadResult.value;

    if (uploadResponse.status === 308) {
      const range = uploadResponse.headers.get("Range");
      if (range != null) {
        const match = /bytes=0-(\d+)/.exec(range);
        if (match?.[1] != null) {
          offset = parseInt(match[1], 10) + 1;
          continue;
        }
      }
      offset = end + 1;
      continue;
    }

    if (uploadResponse.status >= 200 && uploadResponse.status < 300) {
      let driveFile: DriveFile;
      try {
        driveFile = (await uploadResponse.json()) as DriveFile;
      } catch {
        return err(appError("PARSE_ERROR", "Invalid upload response"));
      }
      return ok({
        fileId: driveFile.id,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });
    }

    const errText = await uploadResponse.text().catch(() => "");
    return err(
      appError(
        "WRITE_FAILED",
        `Upload failed (HTTP ${String(uploadResponse.status)}): ${errText}`,
      ),
    );
  }

  return err(appError("WRITE_FAILED", "Upload completed without file metadata"));
}

/** Fetch attachment bytes from Drive. */
export async function fetchAttachmentBlob(fileId: string): Promise<Result<Blob>> {
  const result = await httpFetchRaw(
    `${DRIVE_API}/files/${fileId}?alt=media`,
  );
  if (!result.ok) return result;

  const response = result.value;
  if (!response.ok) {
    return err(
      appError("DRIVE_NOT_FOUND", `Could not download attachment (${String(response.status)})`),
    );
  }

  const blob = await response.blob();
  return ok(blob);
}

/** Delete a file from Drive (best-effort on remove). */
export async function deleteDriveFile(fileId: string): Promise<Result<void>> {
  const result = await httpFetch<unknown>(`${DRIVE_API}/files/${fileId}`, {
    method: "DELETE",
  });
  if (!result.ok) return result;
  return ok(undefined);
}
