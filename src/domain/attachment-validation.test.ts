import { describe, it, expect } from "vitest";
import {
  addPendingAttachmentFiles,
  dedupeAttachmentFiles,
  MAX_ATTACHMENTS_PER_PROJECT,
  validateAttachmentFile,
} from "./attachment-validation";

function makeFile(name: string, size = 1024, type = "application/pdf"): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe("validateAttachmentFile", () => {
  it("accepts a valid PDF", () => {
    const file = makeFile("receipt.pdf");
    expect(validateAttachmentFile(file, 0).ok).toBe(true);
  });

  it("rejects unsupported file types", () => {
    const file = makeFile("notes.txt", 100, "text/plain");
    const result = validateAttachmentFile(file, 0);
    expect(result.ok).toBe(false);
  });

  it("rejects empty files", () => {
    const file = makeFile("empty.pdf", 0);
    const result = validateAttachmentFile(file, 0);
    expect(result.ok).toBe(false);
  });

  it("rejects when at attachment limit", () => {
    const file = makeFile("receipt.pdf");
    const result = validateAttachmentFile(file, MAX_ATTACHMENTS_PER_PROJECT);
    expect(result.ok).toBe(false);
  });
});

describe("dedupeAttachmentFiles", () => {
  it("removes duplicate files", () => {
    const a = makeFile("a.pdf");
    const b = makeFile("b.pdf");
    const result = dedupeAttachmentFiles([a, b, a]);
    expect(result).toHaveLength(2);
  });
});

describe("addPendingAttachmentFiles", () => {
  it("merges valid incoming files", () => {
    const a = makeFile("a.pdf");
    const b = makeFile("b.pdf");
    const result = addPendingAttachmentFiles([], [a, b]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(2);
    }
  });

  it("skips duplicate files", () => {
    const file = makeFile("a.pdf");
    const result = addPendingAttachmentFiles([file], [file]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
    }
  });

  it("rejects when over limit", () => {
    const existing = Array.from({ length: MAX_ATTACHMENTS_PER_PROJECT }, (_, i) =>
      makeFile(`file-${String(i)}.pdf`),
    );
    const result = addPendingAttachmentFiles(existing, [makeFile("extra.pdf")]);
    expect(result.ok).toBe(false);
  });
});
