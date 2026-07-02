import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  THEME_STORAGE_KEY,
  getThemePreference,
  saveThemePreference,
  systemPrefersDark,
  resolveTheme,
  applyResolvedTheme,
} from "@/services/theme";

function mockMatchMedia(matches: boolean): void {
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getThemePreference", () => {
  it("defaults to 'system' when nothing is stored", () => {
    // Arrange + Act
    const result = getThemePreference();

    // Assert
    expect(result).toBe("system");
  });

  it("returns the stored preference", () => {
    // Arrange
    localStorage.setItem(THEME_STORAGE_KEY, "dark");

    // Act
    const result = getThemePreference();

    // Assert
    expect(result).toBe("dark");
  });

  it("falls back to 'system' for a corrupted/invalid stored value", () => {
    // Arrange
    localStorage.setItem(THEME_STORAGE_KEY, "not-a-theme");

    // Act
    const result = getThemePreference();

    // Assert
    expect(result).toBe("system");
  });
});

describe("saveThemePreference", () => {
  it("persists the preference to localStorage", () => {
    // Act
    saveThemePreference("light");

    // Assert
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });
});

describe("systemPrefersDark", () => {
  it("reflects the matchMedia result", () => {
    // Arrange
    mockMatchMedia(true);

    // Act + Assert
    expect(systemPrefersDark()).toBe(true);
  });
});

describe("resolveTheme", () => {
  it("returns 'light' as-is", () => {
    expect(resolveTheme("light")).toBe("light");
  });

  it("returns 'dark' as-is", () => {
    expect(resolveTheme("dark")).toBe("dark");
  });

  it("resolves 'system' to 'dark' when the OS prefers dark", () => {
    // Arrange
    mockMatchMedia(true);

    // Act + Assert
    expect(resolveTheme("system")).toBe("dark");
  });

  it("resolves 'system' to 'light' when the OS prefers light", () => {
    // Arrange
    mockMatchMedia(false);

    // Act + Assert
    expect(resolveTheme("system")).toBe("light");
  });
});

describe("applyResolvedTheme", () => {
  it("adds the 'dark' class for 'dark'", () => {
    // Act
    applyResolvedTheme("dark");

    // Assert
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes the 'dark' class for 'light'", () => {
    // Arrange
    document.documentElement.classList.add("dark");

    // Act
    applyResolvedTheme("light");

    // Assert
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
