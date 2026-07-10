import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { DEMO_MANIFEST } from "@/services/fixtures";
import type { StorageContextValue } from "@/services/storage-context";
import { DashboardPage } from "./dashboard-page";

const mockUseStorage = vi.fn();

vi.mock("@/services/storage-context", () => ({
  useStorage: (): StorageContextValue => mockUseStorage() as StorageContextValue,
}));

vi.mock("@/hooks/use-route-prefix", () => ({
  useRoutePrefix: () => "",
}));

describe("DashboardPage loading states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders skeleton while loading with no manifest", () => {
    // Arrange
    mockUseStorage.mockReturnValue({
      manifest: null,
      loading: true,
      error: null,
      reload: vi.fn(),
      getDocAssessment: vi.fn(),
    });

    // Act
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    // Assert
    expect(screen.getByTestId("dashboard-skeleton")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Cost Basis Added")).toBeInTheDocument();
    expect(screen.getByText("Documentation Health")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recent Projects" })).toBeInTheDocument();
  });

  it("renders dashboard metrics when manifest is loaded", () => {
    // Arrange
    mockUseStorage.mockReturnValue({
      manifest: DEMO_MANIFEST,
      loading: false,
      error: null,
      reload: vi.fn(),
      getDocAssessment: () => ({ status: "complete", missing: [] }),
    });

    // Act
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    // Assert
    expect(screen.queryByTestId("dashboard-skeleton")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("$47,500")).toBeInTheDocument();
  });

  it("renders error banner when load fails with no manifest", () => {
    // Arrange
    mockUseStorage.mockReturnValue({
      manifest: null,
      loading: false,
      error: "Network error",
      reload: vi.fn(),
      getDocAssessment: vi.fn(),
    });

    // Act
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    // Assert
    expect(screen.getByTestId("dashboard-error-banner")).toBeInTheDocument();
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });
});
