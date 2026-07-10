import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProjectForm } from "./project-form";

describe("ProjectForm", () => {
  it("opens the Safe Harbor tooltip without toggling the checkbox", () => {
    // Arrange
    render(<ProjectForm onSubmit={vi.fn()} submitLabel="Save" />);
    fireEvent.click(screen.getByRole("button", { name: /irs details/i }));
    const checkbox = screen.getByRole("checkbox", { name: /safe harbor election/i });

    // Act
    fireEvent.click(screen.getByRole("button", { name: /about safe harbor election/i }));

    // Assert
    expect(checkbox).not.toBeChecked();
    expect(screen.getByRole("tooltip")).toHaveTextContent(/de minimis safe harbor/i);
  });
});
