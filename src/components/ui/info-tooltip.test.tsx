import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InfoTooltip } from "./info-tooltip";

describe("InfoTooltip", () => {
  it("renders tooltip content when the info button is clicked", () => {
    // Arrange
    render(
      <InfoTooltip label="About safe harbor election">
        Safe harbor explanation text.
      </InfoTooltip>,
    );

    // Act
    fireEvent.click(screen.getByRole("button", { name: /about safe harbor election/i }));

    // Assert
    expect(screen.getByRole("tooltip")).toHaveTextContent("Safe harbor explanation text.");
  });

  it("hides tooltip content after the button loses focus", () => {
    // Arrange
    render(
      <InfoTooltip label="About safe harbor election">
        Safe harbor explanation text.
      </InfoTooltip>,
    );
    const button = screen.getByRole("button", { name: /about safe harbor election/i });
    fireEvent.click(button);

    // Act
    fireEvent.blur(button);

    // Assert
    expect(screen.getByRole("tooltip")).toHaveClass("opacity-0");
  });
});
