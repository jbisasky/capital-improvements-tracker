import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { uploadAttachmentResumable } from "./drive-attachment";

describe("uploadAttachmentResumable", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("completes a single-chunk resumable upload", async () => {
    fetchMock
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers({
          Location: "https://upload.example.com/session",
        }),
        text: () => Promise.resolve(""),
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({
          id: "drive-file-123",
          name: "receipt.pdf",
          mimeType: "application/pdf",
        }),
      });

    const file = new File(["pdf-bytes"], "receipt.pdf", { type: "application/pdf" });
    const result = await uploadAttachmentResumable(file, "folder-id");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      fileId: "drive-file-123",
      filename: "receipt.pdf",
      mimeType: "application/pdf",
      sizeBytes: file.size,
    });
  });
});
