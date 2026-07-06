import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { NewProjectAttachments } from "./new-project-attachments";

function makeFile(name: string): File {
  return new File(["data"], name, { type: "application/pdf" });
}

const baseProps = {
  files: [],
  onFilesChange: vi.fn(),
  onValidationError: vi.fn(),
};

describe("NewProjectAttachments — extraction checkboxes", () => {
  it("does not show checkboxes when showExtract is false", () => {
    // Arrange
    const files = [makeFile("invoice.pdf"), makeFile("statement.pdf")];

    // Act
    render(
      <MemoryRouter>
        <NewProjectAttachments
          {...baseProps}
          files={files}
          showExtract={false}
        />
      </MemoryRouter>,
    );

    // Assert — no checkboxes rendered
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("shows a checked checkbox per file when showExtract is true", () => {
    // Arrange
    const files = [makeFile("invoice.pdf"), makeFile("statement.pdf")];

    // Act
    render(
      <MemoryRouter>
        <NewProjectAttachments
          {...baseProps}
          files={files}
          showExtract
          excludedIndices={new Set()}
          onToggleExclude={vi.fn()}
        />
      </MemoryRouter>,
    );

    // Assert — two checked checkboxes
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(2);
    checkboxes.forEach((cb) => {
      expect(cb).toBeChecked();
    });
  });

  it("renders an excluded file's checkbox as unchecked and filename as struck-through", () => {
    // Arrange
    const files = [makeFile("invoice.pdf"), makeFile("statement.pdf")];

    // Act
    render(
      <MemoryRouter>
        <NewProjectAttachments
          {...baseProps}
          files={files}
          showExtract
          excludedIndices={new Set([1])}
          onToggleExclude={vi.fn()}
        />
      </MemoryRouter>,
    );

    // Assert
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();

    // Statement filename should have line-through class
    const statementSpan = screen.getByText("statement.pdf");
    expect(statementSpan.className).toContain("line-through");
  });

  it("calls onToggleExclude with the correct index when checkbox is clicked", () => {
    // Arrange
    const onToggleExclude = vi.fn();
    const files = [makeFile("invoice.pdf"), makeFile("statement.pdf")];

    // Act
    render(
      <MemoryRouter>
        <NewProjectAttachments
          {...baseProps}
          files={files}
          showExtract
          excludedIndices={new Set()}
          onToggleExclude={onToggleExclude}
        />
      </MemoryRouter>,
    );

    // Click the second checkbox (index 1)
    const checkboxes = screen.getAllByRole("checkbox");
    const secondCheckbox = checkboxes[1];
    if (secondCheckbox == null) throw new Error("Expected second checkbox");
    fireEvent.click(secondCheckbox);

    // Assert
    expect(onToggleExclude).toHaveBeenCalledWith(1);
  });

  it("shows the privacy note near the extract button when key is configured", () => {
    // Arrange
    const files = [makeFile("invoice.pdf")];

    // Act
    render(
      <MemoryRouter>
        <NewProjectAttachments
          {...baseProps}
          files={files}
          showExtract
          keyConfigured
          onExtract={vi.fn()}
          excludedIndices={new Set()}
          onToggleExclude={vi.fn()}
        />
      </MemoryRouter>,
    );

    // Assert
    expect(screen.getByText(/sent to Google's Gemini API/i)).toBeInTheDocument();
  });
});
