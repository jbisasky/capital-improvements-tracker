import { describe, it, expect } from "vitest";
import {
  validateAttachmentFile,
  dedupeAttachmentFiles,
  MAX_ATTACHMENTS_PER_PROJECT,
  MAX_ATTACHMENT_BYTES,
} from "./attachment-validation";

describe("validateAttachmentFile", () => {
  it("accepts a valid PDF under the size limit", () => {
    const file = new File(["x"], "receipt.pdf", { type: "application/pdf" });
    expect(validateAttachmentFile(file, 0).ok).toBe(true);
  });

  it("rejects unsupported MIME types", () => {
    const file = new File(["x"], "doc.txt", { type: "text/plain" });
    const result = validateAttachmentFile(file, 0);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain("Unsupported file type");
  });

  it("rejects files over 25 MB", () => {
    const file = new File([new ArrayBuffer(MAX_ATTACHMENT_BYTES + 1)], "big.pdf", {
      type: "application/pdf",
    });
    const result = validateAttachmentFile(file, 0);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain("25 MB");
  });

  it("rejects when at the per-project attachment limit", () => {
    const file = new File(["x"], "receipt.pdf", { type: "application/pdf" });
    const result = validateAttachmentFile(file, MAX_ATTACHMENTS_PER_PROJECT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain(String(MAX_ATTACHMENTS_PER_PROJECT));
  });
});

describe("dedupeAttachmentFiles", () => {
  it("removes duplicate files by name size and type", () => {
    const a = new File(["a"], "receipt.pdf", { type: "application/pdf" });
    const b = new File(["b"], "receipt.pdf", { type: "application/pdf", lastModified: 1 });
    Object.defineProperty(b, "size", { value: a.size });

    const result = dedupeAttachmentFiles([a, b, a]);
    expect(result).toHaveLength(1);
  });
});
