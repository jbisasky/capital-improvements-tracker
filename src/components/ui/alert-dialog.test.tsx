import { useState, type ReactElement } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AlertDialog } from "./alert-dialog";

function DialogHarness(): ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => { setOpen(true); }}>
        Open delete dialog
      </button>
      <AlertDialog
        open={open}
        onOpenChange={setOpen}
        title="Remove attachment?"
        description="This file will be trashed."
        onConfirm={() => { setOpen(false); }}
      />
    </>
  );
}

describe("AlertDialog", () => {
  it("calls onConfirm when the confirm button is clicked", () => {
    // Arrange
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <AlertDialog
        open
        onOpenChange={onOpenChange}
        title="Remove attachment?"
        description="This file will be trashed."
        onConfirm={onConfirm}
      />,
    );

    // Act
    fireEvent.click(screen.getByRole("button", { name: /^remove$/i }));

    // Assert
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls onOpenChange(false) when cancel is clicked", () => {
    // Arrange
    const onOpenChange = vi.fn();

    render(
      <AlertDialog
        open
        onOpenChange={onOpenChange}
        title="Remove attachment?"
        description="This file will be trashed."
        onConfirm={vi.fn()}
      />,
    );

    // Act
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    // Assert
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("moves focus to cancel when opened", async () => {
    // Arrange / Act
    render(
      <AlertDialog
        open
        onOpenChange={vi.fn()}
        title="Remove attachment?"
        description="This file will be trashed."
        onConfirm={vi.fn()}
      />,
    );

    // Assert
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /cancel/i })).toHaveFocus();
    });
  });

  it("wraps focus inside the dialog actions", async () => {
    // Arrange
    render(
      <AlertDialog
        open
        onOpenChange={vi.fn()}
        title="Remove attachment?"
        description="This file will be trashed."
        onConfirm={vi.fn()}
      />,
    );
    const cancel = screen.getByRole("button", { name: /cancel/i });
    const confirm = screen.getByRole("button", { name: /^remove$/i });
    await waitFor(() => {
      expect(cancel).toHaveFocus();
    });

    // Act / Assert
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(confirm).toHaveFocus();

    fireEvent.keyDown(window, { key: "Tab" });
    expect(cancel).toHaveFocus();
  });

  it("restores focus to the opener when closed", async () => {
    // Arrange
    render(<DialogHarness />);
    const opener = screen.getByRole("button", { name: /open delete dialog/i });
    fireEvent.click(opener);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /cancel/i })).toHaveFocus();
    });

    // Act
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    // Assert
    await waitFor(() => {
      expect(opener).toHaveFocus();
    });
  });
});
