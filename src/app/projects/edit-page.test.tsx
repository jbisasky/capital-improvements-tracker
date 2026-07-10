import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { DEMO_MANIFEST } from "@/services/fixtures";
import type { StorageContextValue } from "@/services/storage-context";
import { ProjectEditPage } from "./edit-page";

const mockUseStorage = vi.fn();

vi.mock("@/services/storage-context", () => ({
  useStorage: (): StorageContextValue => mockUseStorage() as StorageContextValue,
}));

vi.mock("@/hooks/use-route-prefix", () => ({
  useRoutePrefix: () => "",
}));

vi.mock("@/services/analytics", () => ({
  trackProjectEdited: vi.fn(),
}));

vi.mock("@/app/projects/attachment-section", () => ({
  AttachmentSection: () => <div data-testid="attachment-section" />,
}));

vi.mock("@/app/projects/project-form", () => ({
  ProjectForm: () => <div data-testid="project-form" />,
}));

const demoProject = DEMO_MANIFEST.projects[0];
if (demoProject == null) {
  throw new Error("DEMO_MANIFEST fixture must include at least one project");
}
const PROJECT_ID = demoProject.id;

function renderEditPage(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[`/projects/${PROJECT_ID}/edit`]}>
      <Routes>
        <Route path="/projects/:id/edit" element={<ProjectEditPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProjectEditPage loading states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page chrome and skeletons while manifest is loading", () => {
    // Arrange
    mockUseStorage.mockReturnValue({
      manifest: null,
      loading: true,
      updateProject: vi.fn(),
    });

    // Act
    renderEditPage();

    // Assert
    expect(screen.getByRole("link", { name: /back to project/i })).toBeInTheDocument();
    expect(screen.getByText("Edit:")).toBeInTheDocument();
    expect(screen.getByText("Basic Information")).toBeInTheDocument();
    expect(screen.getByText("IRS Details (optional)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();
    expect(screen.getByTestId("project-edit-skeleton")).toBeInTheDocument();
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  it("renders edit form when manifest is loaded", () => {
    // Arrange
    mockUseStorage.mockReturnValue({
      manifest: DEMO_MANIFEST,
      loading: false,
      updateProject: vi.fn(),
    });

    // Act
    renderEditPage();

    // Assert
    expect(screen.queryByTestId("project-edit-skeleton")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /edit: complete roof replacement/i })).toBeInTheDocument();
    expect(screen.getByTestId("attachment-section")).toBeInTheDocument();
    expect(screen.getByTestId("project-form")).toBeInTheDocument();
  });
});
