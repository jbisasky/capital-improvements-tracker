import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { uploadAttachmentResumable } from "./drive-attachment";

function mockFetchResponse(options: {
  status: number;
  ok?: boolean;
  headers?: Headers;
  body?: string;
}): Response {
  const body = options.body ?? "";
  const bytes = new TextEncoder().encode(body);
  return {
    ok: options.ok ?? (options.status >= 200 && options.status < 300),
    status: options.status,
    headers: options.headers ?? new Headers(),
    arrayBuffer: () =>
      Promise.resolve(
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      ),
  } as Response;
}

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
      .mockResolvedValueOnce(
        mockFetchResponse({
          status: 200,
          headers: new Headers({
            Location: "https://upload.example.com/session",
          }),
        }),
      )
      .mockResolvedValueOnce(
        mockFetchResponse({
          status: 200,
          body: JSON.stringify({
            id: "drive-file-123",
            name: "receipt.pdf",
            mimeType: "application/pdf",
          }),
        }),
      );

    const file = new File(["pdf-bytes"], "receipt.pdf", { type: "application/pdf" });
    const result = await uploadAttachmentResumable(file, "folder-id");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      id: "drive-file-123",
      name: "receipt.pdf",
      mimeType: "application/pdf",
    });
  });
});
