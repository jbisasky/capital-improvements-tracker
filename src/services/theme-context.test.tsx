import { type ReactElement } from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "@/services/theme-context";
import { THEME_STORAGE_KEY } from "@/services/theme";

interface MockMedia {
  matches: boolean;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
}

let currentMedia: MockMedia | null = null;
let changeHandler: (() => void) | null = null;

function mockMatchMedia(matches: boolean): void {
  changeHandler = null;
  const media: MockMedia = {
    matches,
    addEventListener: vi.fn((_event: string, handler: () => void) => { changeHandler = handler; }),
    removeEventListener: vi.fn(),
  };
  currentMedia = media;
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue(media));
}

/** Simulate the OS/browser firing a `prefers-color-scheme` change event. */
function triggerSystemChange(matches: boolean): void {
  if (currentMedia == null || changeHandler == null) {
    throw new Error("matchMedia listener was not registered");
  }
  currentMedia.matches = matches;
  act(() => { changeHandler?.(); });
}

function ThemeProbe(): ReactElement {
  const { preference, resolvedTheme, setPreference } = useTheme();
  return (
    <div>
      <span data-testid="preference">{preference}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button type="button" onClick={() => { setPreference("dark"); }}>Set Dark</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ThemeProvider", () => {
  it("defaults to 'system' and resolves against the OS preference", () => {
    // Arrange
    mockMatchMedia(true);

    // Act
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);

    // Assert
    expect(screen.getByTestId("preference")).toHaveTextContent("system");
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("setPreference persists to localStorage and applies the .dark class", () => {
    // Arrange
    mockMatchMedia(false);
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Set Dark" }));

    // Assert
    expect(screen.getByTestId("preference")).toHaveTextContent("dark");
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("reacts to a live OS theme change while preference is 'system'", () => {
    // Arrange
    mockMatchMedia(false);
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);
    expect(screen.getByTestId("resolved")).toHaveTextContent("light");

    // Act — simulate the OS switching to dark via the registered listener
    triggerSystemChange(true);

    // Assert
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("useTheme throws when used outside a ThemeProvider", () => {
    // Arrange
    function renderProbeAlone(): void {
      render(<ThemeProbe />);
    }

    // Act + Assert
    expect(renderProbeAlone).toThrow(/must be used within a ThemeProvider/i);
  });
});
