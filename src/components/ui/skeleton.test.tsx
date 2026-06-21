import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Skeleton } from "@/components/ui/skeleton";

describe("Skeleton", () => {
  it("renders a div with the animate-pulse class", () => {
    // Arrange + Act
    render(<Skeleton data-testid="sk" />);

    // Assert
    const el = screen.getByTestId("sk");
    expect(el.tagName).toBe("DIV");
    expect(el.className).toContain("animate-pulse");
  });

  it("merges additional className onto the element", () => {
    // Arrange + Act
    render(<Skeleton data-testid="sk" className="h-8 w-36" />);

    // Assert
    const el = screen.getByTestId("sk");
    expect(el.className).toContain("h-8");
    expect(el.className).toContain("w-36");
  });

  it("passes through arbitrary HTML attributes", () => {
    // Arrange + Act
    render(<Skeleton data-testid="sk" aria-label="loading" />);

    // Assert
    expect(screen.getByTestId("sk")).toHaveAttribute("aria-label", "loading");
  });

  it("applies rounded-md and bg-slate-200/80 by default", () => {
    // Arrange + Act
    render(<Skeleton data-testid="sk" />);

    // Assert
    const el = screen.getByTestId("sk");
    expect(el.className).toContain("rounded-md");
    expect(el.className).toContain("bg-slate-200/80");
  });
});
