import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AlertDialog } from "./alert-dialog";

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
});
