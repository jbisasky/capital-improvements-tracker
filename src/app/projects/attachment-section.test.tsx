import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { axe } from "vitest-axe";
import { AttachmentSection } from "./attachment-section";

const removeAttachment = vi.fn();

vi.mock("@/services/storage-context", () => ({
  useStorage: () => ({
    uploadAttachment: vi.fn(),
    removeAttachment,
    getAttachmentBlob: vi.fn(),
  }),
}));

describe("AttachmentSection", () => {
  beforeEach(() => {
    removeAttachment.mockClear();
  });
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
    expect(screen.getByRole("button", { name: /Upload receipt or photo/i })).toBeDisabled();
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

  it("confirms before removing an uploaded attachment", () => {
    // Arrange
    render(
      <AttachmentSection
        projectId="project-1"
        attachments={[
          {
            fileId: "file-0",
            filename: "roof-invoice.pdf",
            mimeType: "application/pdf",
            sizeBytes: 1000,
          },
        ]}
        mode="live"
      />,
    );

    // Act — open confirm dialog
    fireEvent.click(screen.getByRole("button", { name: /^remove$/i }));

    // Assert — not removed yet
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/roof-invoice\.pdf/)).toBeInTheDocument();
    expect(removeAttachment).not.toHaveBeenCalled();

    // Act — cancel
    fireEvent.click(within(dialog).getByRole("button", { name: /cancel/i }));
    expect(removeAttachment).not.toHaveBeenCalled();

    // Act — confirm removal
    fireEvent.click(screen.getByRole("button", { name: /^remove$/i }));
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: /remove attachment/i,
      }),
    );

    // Assert
    expect(removeAttachment).toHaveBeenCalledWith("project-1", "file-0");
  });
});
