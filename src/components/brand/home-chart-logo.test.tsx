import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HomeChartLogo } from "./home-chart-logo";

describe("HomeChartLogo", () => {
  it("renders an accessible label by default", () => {
    render(<HomeChartLogo />);

    expect(screen.getByRole("img", { name: /capital improvements/i })).toBeInTheDocument();
  });

  it("is hidden from accessibility tree when decorative", () => {
    render(<HomeChartLogo decorative />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("omits the outer circle when markOnly is set", () => {
    const { container } = render(<HomeChartLogo markOnly decorative />);

    expect(container.querySelector("circle")).not.toBeInTheDocument();
  });
});
