import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { DEMO_MANIFEST } from "@/services/fixtures";
import type { StorageContextValue } from "@/services/storage-context";
import { ProjectDetailPage } from "./detail-page";

const mockUseStorage = vi.fn();

vi.mock("@/services/storage-context", () => ({
  useStorage: (): StorageContextValue => mockUseStorage() as StorageContextValue,
}));

vi.mock("@/hooks/use-route-prefix", () => ({
  useRoutePrefix: () => "",
}));

vi.mock("@/app/projects/attachment-section", () => ({
  AttachmentSection: () => <div data-testid="attachment-section" />,
}));

const demoProject = DEMO_MANIFEST.projects[0];
if (demoProject == null) {
  throw new Error("DEMO_MANIFEST fixture must include at least one project");
}
const PROJECT_ID = demoProject.id;

function renderDetailPage(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[`/projects/${PROJECT_ID}`]}>
      <Routes>
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProjectDetailPage loading states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page chrome and skeletons while manifest is loading", () => {
    // Arrange
    mockUseStorage.mockReturnValue({
      manifest: null,
      loading: true,
      deleteProject: vi.fn(),
      getDocAssessment: vi.fn(),
    });

    // Act
    renderDetailPage();

    // Assert
    expect(screen.getByRole("link", { name: /back to projects/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /edit/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /delete/i })).toBeDisabled();
    expect(screen.getByText("Total Cost")).toBeInTheDocument();
    expect(screen.getByText("Documentation Health")).toBeInTheDocument();
    expect(screen.getByText("AI Confidence")).toBeInTheDocument();
    expect(screen.getByTestId("project-detail-skeleton")).toBeInTheDocument();
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  it("renders project data when manifest is loaded", () => {
    // Arrange
    mockUseStorage.mockReturnValue({
      manifest: DEMO_MANIFEST,
      loading: false,
      deleteProject: vi.fn(),
      getDocAssessment: () => ({ status: "partial", score: 75, missing: ["receipt"], recommended: [] }),
    });

    // Act
    renderDetailPage();

    // Assert
    expect(screen.queryByTestId("project-detail-skeleton")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Complete Roof Replacement" })).toBeInTheDocument();
    expect(screen.getByTestId("attachment-section")).toBeInTheDocument();
  });
});
