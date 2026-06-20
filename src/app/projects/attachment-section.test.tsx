import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AttachmentSection } from "./attachment-section";

vi.mock("@/services/storage-context", () => ({
  useStorage: () => ({
    uploadProjectAttachment: vi.fn(),
    removeProjectAttachment: vi.fn(),
    getAttachmentBlob: vi.fn(),
  }),
}));

describe("AttachmentSection", () => {
  it("disables upload buttons at the attachment limit", () => {
    const attachments = Array.from({ length: 10 }, (_, i) => ({
      fileId: `file-${String(i)}`,
      filename: `file-${String(i)}.pdf`,
      mimeType: "application/pdf",
      sizeBytes: 100,
    }));

    render(
      <AttachmentSection
        projectId="project-1"
        attachments={attachments}
        mode="live"
      />,
    );

    expect(screen.getByRole("button", { name: /Upload file/i })).toBeDisabled();
  });

  it("adds pending files in pending mode", () => {
    const onPendingFilesChange = vi.fn();

    render(
      <AttachmentSection
        projectId="project-1"
        attachments={[]}
        mode="pending"
        pendingFiles={[]}
        onPendingFilesChange={onPendingFilesChange}
      />,
    );

    const input = document.querySelector('input[type="file"]:not([capture])');
    expect(input).not.toBeNull();

    const file = new File(["x"], "receipt.pdf", { type: "application/pdf" });
    fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });

    expect(onPendingFilesChange).toHaveBeenCalled();
  });
});
