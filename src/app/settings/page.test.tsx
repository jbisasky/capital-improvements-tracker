import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SettingsPage } from "./page";
import { type Manifest } from "@/domain/schemas";
import { ok, err } from "@/domain/result";
import { appError } from "@/domain/errors";

const baseManifest: Manifest = {
  schemaVersion: 2,
  lastUpdated: "2025-01-01T00:00:00.000Z",
  summary: { totalCostBasisAdded: 0, totalDeductible: 0 },
  projects: [],
};

const manifestWithProperty: Manifest = {
  ...baseManifest,
  property: {
    address: "11507 Links Dr",
    city: "Reston",
    state: "VA",
    zip: "20190",
    propertyType: "primary_residence",
  },
};

const mockSaveProperty = vi.fn();
const mockSetThemePreference = vi.fn();

vi.mock("@/services/theme-context", () => ({
  useTheme: () => ({
    preference: "system",
    resolvedTheme: "light",
    setPreference: mockSetThemePreference,
  }),
}));

vi.mock("@/services/storage-context", () => ({
  useStorage: () => ({
    manifest: manifestWithProperty,
    attachmentsFolderId: null,
    attachmentsFolderName: "Capital Improvements",
    saveProperty: mockSaveProperty,
    writesDisabled: false,
  }),
}));

vi.mock("@/services/auth-context", () => ({
  useAuth: () => ({ signOut: vi.fn() }),
}));

vi.mock("@/hooks/use-route-prefix", () => ({
  useRoutePrefix: () => "",
}));

vi.mock("@/services/gemini-key", () => ({
  getGeminiKey: () => null,
  saveGeminiKey: vi.fn(),
  clearGeminiKey: vi.fn(),
  getKeyExpiry: () => 30,
  isSessionOnly: () => false,
}));

vi.mock("@/services/ai-budget", () => ({
  getBudgetSettings: () => ({ maxAiCallsPerSession: 50, maxAiCallsPerDay: 200, maxAiTokensPerDay: 2_000_000 }),
  saveBudgetSettings: vi.fn(),
  getUsageCounters: () => ({ dailyCalls: 0, dailyTokens: 0, sessionCalls: 0 }),
}));

vi.mock("@/services/analytics", () => ({
  trackClearAllData: vi.fn(),
  trackBYOKKeySaved: vi.fn(),
}));

vi.mock("@/services/gemini", () => ({
  testGeminiKey: vi.fn(),
}));

vi.mock("react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock("@/services/clear-local-data", () => ({
  clearLocalDeviceData: vi.fn(),
}));

beforeEach(() => {
  mockSaveProperty.mockReset();
});

describe("SettingsPage — property form", () => {
  it("renders pre-filled fields from the manifest", () => {
    // Arrange & Act
    render(<SettingsPage />);

    // Assert
    expect(screen.getByDisplayValue("11507 Links Dr")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Reston")).toBeInTheDocument();
    // state is a <select> — check the selected option value
    const stateSelect = document.getElementById("state") as HTMLSelectElement;
    expect(stateSelect.value).toBe("VA");
    expect(screen.getByDisplayValue("20190")).toBeInTheDocument();
  });

  it("renders the optional Address 2 field", () => {
    // Arrange & Act
    render(<SettingsPage />);

    // Assert
    expect(screen.getByLabelText(/street address 2/i)).toBeInTheDocument();
  });

  it("calls saveProperty with trimmed values on submit", async () => {
    // Arrange
    mockSaveProperty.mockResolvedValue(ok(manifestWithProperty));
    render(<SettingsPage />);

    // Act — change city and submit
    const cityInput = screen.getByLabelText(/^city/i);
    fireEvent.change(cityInput, { target: { value: "  Arlington  " } });
    fireEvent.click(screen.getByRole("button", { name: /save property/i }));

    // Assert
    await waitFor(() => {
      expect(mockSaveProperty).toHaveBeenCalledOnce();
    });
    const call = mockSaveProperty.mock.calls[0]?.[0] as { city: string } | undefined;
    expect(call?.city).toBe("Arlington");
  });

  it("shows 'Saved ✓' after a successful save then reverts to idle", async () => {
    // Arrange
    mockSaveProperty.mockResolvedValue(ok(manifestWithProperty));
    render(<SettingsPage />);

    // Act
    fireEvent.click(screen.getByRole("button", { name: /save property/i }));

    // Assert — button transitions to Saved
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /saved/i })).toBeInTheDocument();
    });
  });

  it("shows an error message when saveProperty returns err", async () => {
    // Arrange
    mockSaveProperty.mockResolvedValue(err(appError("DRIVE_CONFLICT", "Conflict saving manifest")));
    render(<SettingsPage />);

    // Act
    fireEvent.click(screen.getByRole("button", { name: /save property/i }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/couldn't save your property: conflict saving manifest/i)).toBeInTheDocument();
    });
  });

  it("shows validation error if required fields are empty", async () => {
    // Arrange
    render(<SettingsPage />);
    const addressInput = document.getElementById("address") as HTMLInputElement;
    fireEvent.change(addressInput, { target: { value: "" } });
    const cityInput = document.getElementById("city") as HTMLInputElement;
    fireEvent.change(cityInput, { target: { value: "" } });

    // Act — submit the form directly to bypass HTML5 required constraint in jsdom
    const form = addressInput.closest("form") as HTMLFormElement;
    fireEvent.submit(form);

    // Assert — per-field errors appear
    expect(mockSaveProperty).not.toHaveBeenCalled();
    expect(screen.getByText(/please enter your street address/i)).toBeInTheDocument();
    expect(screen.getByText(/please enter your city/i)).toBeInTheDocument();
  });

  it("strips digits from city input", () => {
    // Arrange
    render(<SettingsPage />);
    const cityInput = document.getElementById("city") as HTMLInputElement;

    // Act
    fireEvent.change(cityInput, { target: { value: "Reston123" } });

    // Assert — digits removed
    expect(cityInput.value).toBe("Reston");
  });

  it("auto-formats ZIP with hyphen after 5 digits", () => {
    // Arrange
    render(<SettingsPage />);
    const zipInput = document.getElementById("zip") as HTMLInputElement;

    // Act
    fireEvent.change(zipInput, { target: { value: "201904530" } });

    // Assert
    expect(zipInput.value).toBe("20190-4530");
  });

  it("rejects address without both a number and a letter", async () => {
    // Arrange
    render(<SettingsPage />);
    const addressInput = document.getElementById("address") as HTMLInputElement;
    fireEvent.change(addressInput, { target: { value: "NoNumbers" } });
    const form = addressInput.closest("form") as HTMLFormElement;

    // Act
    fireEvent.submit(form);

    // Assert
    expect(mockSaveProperty).not.toHaveBeenCalled();
    expect(screen.getByText(/include a house number and street name/i)).toBeInTheDocument();
  });

  it("includes address2 in the saveProperty payload when filled", async () => {
    // Arrange
    mockSaveProperty.mockResolvedValue(ok(manifestWithProperty));
    render(<SettingsPage />);
    const address2Input = screen.getByLabelText(/street address 2/i);
    fireEvent.change(address2Input, { target: { value: "Unit 4B" } });

    // Act
    fireEvent.click(screen.getByRole("button", { name: /save property/i }));

    // Assert
    await waitFor(() => expect(mockSaveProperty).toHaveBeenCalledOnce());
    const call = mockSaveProperty.mock.calls[0]?.[0] as { address2?: string } | undefined;
    expect(call?.address2).toBe("Unit 4B");
  });
});

describe("SettingsPage — Appearance", () => {
  beforeEach(() => {
    mockSetThemePreference.mockReset();
  });

  it("renders Light, Dark, and System theme options", () => {
    // Arrange & Act
    render(<SettingsPage />);

    // Assert
    expect(screen.getByRole("radio", { name: /light/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /dark/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /system/i })).toBeInTheDocument();
  });

  it("marks the current preference (system) as checked", () => {
    // Arrange & Act
    render(<SettingsPage />);

    // Assert
    expect(screen.getByRole("radio", { name: /system/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /light/i })).toHaveAttribute("aria-checked", "false");
  });

  it("calls setPreference with 'dark' when the Dark option is clicked", () => {
    // Arrange
    render(<SettingsPage />);

    // Act
    fireEvent.click(screen.getByRole("radio", { name: /dark/i }));

    // Assert
    expect(mockSetThemePreference).toHaveBeenCalledWith("dark");
  });
});
