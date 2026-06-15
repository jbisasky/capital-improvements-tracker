import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AboutPage } from "./page";

vi.mock("../../../package.json", () => ({
  version: "1.2.3",
}));

function renderAbout(): ReturnType<typeof render> {
  return render(<AboutPage />);
}

describe("AboutPage", () => {
  it("renders version string", () => {
    // Arrange & Act
    renderAbout();

    // Assert
    expect(screen.getByText(/version 1\.2\.3/i)).toBeInTheDocument();
  });

  it("renders disclaimer text", () => {
    // Arrange & Act
    renderAbout();

    // Assert
    expect(
      screen.getByText(/not tax advice/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/informational purposes only/i),
    ).toBeInTheDocument();
  });

  it("renders all documentation links with correct href values", () => {
    // Arrange & Act
    renderAbout();

    // Assert
    const hld = screen.getByRole("link", { name: /high-level design/i });
    expect(hld).toHaveAttribute(
      "href",
      "https://github.com/jbisasky/capital-improvements-tracker/blob/main/docs/high-level-design.md",
    );

    const lld = screen.getByRole("link", { name: /low-level design/i });
    expect(lld).toHaveAttribute(
      "href",
      "https://github.com/jbisasky/capital-improvements-tracker/blob/main/docs/low-level-design.md",
    );

    const ears = screen.getByRole("link", { name: /requirements/i });
    expect(ears).toHaveAttribute(
      "href",
      "https://github.com/jbisasky/capital-improvements-tracker/blob/main/docs/requirements-ears.md",
    );

    const gcp = screen.getByRole("link", { name: /google cloud setup/i });
    expect(gcp).toHaveAttribute(
      "href",
      "https://github.com/jbisasky/capital-improvements-tracker/blob/main/docs/google-cloud-setup.md",
    );
  });
});
