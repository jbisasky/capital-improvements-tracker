import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "vitest-axe";
import { AttachmentSection } from "./attachment-section";

vi.mock("@/services/storage-context", () => ({
  useStorage: () => ({
    uploadAttachment: vi.fn(),
    removeAttachment: vi.fn(),
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

    expect(screen.getByRole("heading", { level: 2, name: /attachments \(10\)/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /Upload file/i })).toBeDisabled();
  });

  it("has no axe violations in live mode (empty attachments)", async () => {
    // Arrange
    const { container } = render(
      <AttachmentSection projectId="project-1" attachments={[]} mode="live" />,
    );

    // Act
    const results = await axe(container);

    // Assert
    expect(results.violations).toEqual([]);
  });

  it("has no axe violations in pending mode", async () => {
    // Arrange
    const { container } = render(
      <AttachmentSection
        projectId="project-1"
        attachments={[]}
        mode="pending"
        pendingFiles={[]}
        onPendingFilesChange={vi.fn()}
      />,
    );

    // Act
    const results = await axe(container);

    // Assert
    expect(results.violations).toEqual([]);
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
