/**
 * Client-side attachment validation — LLD §17.2.
 */

import { type Result, ok, err } from "@/domain/result";
import { appError } from "@/domain/errors";

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_PROJECT = 10;

export const ACCEPTED_ATTACHMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export const ACCEPTED_ATTACHMENT_ACCEPT = ACCEPTED_ATTACHMENT_MIME_TYPES.join(",");

/** Validate a file before upload. */
export function validateAttachmentFile(
  file: File,
  currentCount: number,
): Result<void> {
  if (currentCount >= MAX_ATTACHMENTS_PER_PROJECT) {
    return err(
      appError(
        "VALIDATION_ERROR",
        `Maximum ${String(MAX_ATTACHMENTS_PER_PROJECT)} attachments per project.`,
      ),
    );
  }

  if (
    !ACCEPTED_ATTACHMENT_MIME_TYPES.includes(
      file.type as (typeof ACCEPTED_ATTACHMENT_MIME_TYPES)[number],
    )
  ) {
    return err(
      appError(
        "VALIDATION_ERROR",
        "Unsupported file type. Use JPEG, PNG, WebP, HEIC, or PDF.",
      ),
    );
  }

  if (file.size > MAX_ATTACHMENT_BYTES) {
    return err(
      appError(
        "VALIDATION_ERROR",
        "File too large (max 25 MB). Try compressing or splitting the document.",
      ),
    );
  }

  return ok(undefined);
}

/** Deduplicate files by name + size (for create flow batching). */
export function dedupeAttachmentFiles(files: File[]): File[] {
  const seen = new Set<string>();
  const result: File[] = [];
  for (const file of files) {
    const key = `${file.name}:${String(file.size)}:${file.type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(file);
  }
  return result;
}
