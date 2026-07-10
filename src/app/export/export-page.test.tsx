import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { DEMO_MANIFEST } from "@/services/fixtures";
import { ExportPage } from "./export-page";
import type { StorageContextValue } from "@/services/storage-context";

const mockUseStorage = vi.fn();

vi.mock("@/services/storage-context", () => ({
  useStorage: (): StorageContextValue => mockUseStorage() as StorageContextValue,
}));

vi.mock("@/services/analytics", () => ({
  trackExport: vi.fn(),
}));

describe("ExportPage loading states", () => {
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;

  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => "blob:export");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
  });

  it("renders format and scope controls while manifest is loading", () => {
    // Arrange
    mockUseStorage.mockReturnValue({
      manifest: null,
      loading: true,
    });

    // Act
    render(
      <MemoryRouter>
        <ExportPage />
      </MemoryRouter>,
    );

    // Assert
    expect(screen.getByRole("heading", { name: "Export" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /pdf summary/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /all projects/i })).toBeInTheDocument();
    expect(screen.getByTestId("export-count-skeleton")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download pdf/i })).toBeDisabled();
  });

  it("shows year dropdown skeleton when By tax year is selected during loading", () => {
    // Arrange
    mockUseStorage.mockReturnValue({
      manifest: null,
      loading: true,
    });

    render(
      <MemoryRouter>
        <ExportPage />
      </MemoryRouter>,
    );

    // Act
    fireEvent.click(screen.getByRole("radio", { name: /by tax year/i }));

    // Assert
    expect(screen.getByTestId("export-year-skeleton")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /tax year/i })).not.toBeInTheDocument();
  });

  it("renders project count and download button when manifest is loaded", () => {
    // Arrange
    mockUseStorage.mockReturnValue({
      manifest: DEMO_MANIFEST,
      loading: false,
    });

    // Act
    render(
      <MemoryRouter>
        <ExportPage />
      </MemoryRouter>,
    );

    // Assert
    expect(screen.getByText(/8 projects will be exported\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download pdf/i })).toBeInTheDocument();
    expect(screen.queryByTestId("export-count-skeleton")).not.toBeInTheDocument();
  });

  it("exports the displayed default year after By tax year is selected while loading", async () => {
    // Arrange
    mockUseStorage.mockReturnValue({
      manifest: null,
      loading: true,
    });
    const { rerender } = render(
      <MemoryRouter>
        <ExportPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("radio", { name: /by tax year/i }));

    mockUseStorage.mockReturnValue({
      manifest: DEMO_MANIFEST,
      loading: false,
    });
    rerender(
      <MemoryRouter>
        <ExportPage />
      </MemoryRouter>,
    );

    // Act
    fireEvent.click(screen.getByRole("radio", { name: /^csv$/i }));
    fireEvent.click(screen.getByRole("button", { name: /download csv/i }));

    // Assert
    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalled();
    });
    const [blob] = vi.mocked(URL.createObjectURL).mock.calls[0] ?? [];
    expect(blob).toBeInstanceOf(Blob);
    const csv = await (blob as Blob).text();
    expect(csv).toContain("HVAC System Upgrade");
    expect(csv).not.toContain("Complete Roof Replacement");
  });
});
