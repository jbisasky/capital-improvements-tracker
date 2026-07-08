import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMediaQuery } from "./use-media-query";

function stubMatchMedia(initialMatches: boolean): {
  setMatches: (matches: boolean) => void;
} {
  let matches = initialMatches;
  let listener: ((event: MediaQueryListEvent) => void) | null = null;

  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      get matches() {
        return matches;
      },
      media: query,
      addEventListener: (_: string, handler: (event: MediaQueryListEvent) => void) => {
        listener = handler;
      },
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );

  return {
    setMatches(next: boolean) {
      matches = next;
      listener?.({ matches: next } as MediaQueryListEvent);
    },
  };
}

describe("useMediaQuery", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the initial matchMedia result", () => {
    // Arrange
    stubMatchMedia(true);

    // Act
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));

    // Assert
    expect(result.current).toBe(true);
  });

  it("returns false when the query does not match", () => {
    // Arrange
    stubMatchMedia(false);

    // Act
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));

    // Assert
    expect(result.current).toBe(false);
  });

  it("updates when the media query changes", () => {
    // Arrange
    const media = stubMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(false);

    // Act
    act(() => {
      media.setMatches(true);
    });

    // Assert
    expect(result.current).toBe(true);
  });
});
