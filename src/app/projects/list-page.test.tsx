import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { DEMO_MANIFEST } from "@/services/fixtures";
import type { StorageContextValue } from "@/services/storage-context";
import { ProjectsListPage } from "./list-page";

const mockUseStorage = vi.fn();

vi.mock("@/services/storage-context", () => ({
  useStorage: (): StorageContextValue => mockUseStorage() as StorageContextValue,
}));

vi.mock("@/hooks/use-route-prefix", () => ({
  useRoutePrefix: () => "",
}));

describe("ProjectsListPage loading states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page chrome and skeleton rows while manifest is loading", () => {
    // Arrange
    mockUseStorage.mockReturnValue({
      manifest: null,
      loading: true,
      getDocAssessment: vi.fn(),
    });

    // Act
    render(
      <MemoryRouter>
        <ProjectsListPage />
      </MemoryRouter>,
    );

    // Assert
    expect(screen.getByRole("heading", { name: "Projects" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /add project/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search by title or vendor/i)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /filter by status/i })).toBeInTheDocument();
    expect(screen.getByTestId("projects-list-skeleton")).toBeInTheDocument();
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  it("renders project rows when manifest is loaded", () => {
    // Arrange
    mockUseStorage.mockReturnValue({
      manifest: DEMO_MANIFEST,
      loading: false,
      getDocAssessment: () => ({ status: "complete", missing: [] }),
    });

    // Act
    render(
      <MemoryRouter>
        <ProjectsListPage />
      </MemoryRouter>,
    );

    // Assert
    expect(screen.queryByTestId("projects-list-skeleton")).not.toBeInTheDocument();
    expect(screen.getByText("Complete Roof Replacement")).toBeInTheDocument();
  });
});
