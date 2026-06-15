import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AboutPage } from "./page";

function renderAbout(): ReturnType<typeof render> {
  return render(<AboutPage />);
}

describe("AboutPage", () => {
  it("renders version string", () => {
    // Arrange & Act
    renderAbout();

    // Assert
    expect(screen.getByText(/version\s+\d+\.\d+\.\d+/i)).toBeInTheDocument();
  });

  it("renders disclaimer text", () => {
    // Arrange & Act
    renderAbout();

    // Assert
    expect(
      screen.getByText(/not tax advice.*for recordkeeping only/i),
    ).toBeInTheDocument();
  });

  it("all doc links have correct href values with 'jbisasky'", () => {
    // Arrange & Act
    renderAbout();

    // Assert
    const links = screen.getAllByRole("link");
    const expectedHrefs = [
      "https://github.com/jbisasky/capital-improvements-tracker/blob/main/docs/high-level-design.md",
      "https://github.com/jbisasky/capital-improvements-tracker/blob/main/docs/low-level-design.md",
      "https://github.com/jbisasky/capital-improvements-tracker/blob/main/docs/google-cloud-setup.md",
      "https://github.com/jbisasky/capital-improvements-tracker/blob/main/docs/requirements-ears.md",
    ];

    expect(links).toHaveLength(expectedHrefs.length);
    for (const [index, href] of expectedHrefs.entries()) {
      expect(links[index]).toHaveAttribute("href", href);
    }

    // Verify no 'your-org' remains
    for (const link of links) {
      expect(link.getAttribute("href")).not.toContain("your-org");
    }
  });
});
