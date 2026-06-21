import { type ReactElement } from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { OfflineProvider, useOffline } from "./offline-context";

function OnlineProbe(): ReactElement {
  const { isOnline } = useOffline();
  return <span data-testid="online">{isOnline ? "yes" : "no"}</span>;
}

describe("OfflineProvider", () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reflects navigator.onLine changes", () => {
    // Arrange
    render(
      <OfflineProvider>
        <OnlineProbe />
      </OfflineProvider>,
    );

    // Assert
    expect(screen.getByTestId("online")).toHaveTextContent("yes");

    // Act
    act(() => {
      Object.defineProperty(window.navigator, "onLine", {
        configurable: true,
        value: false,
      });
      window.dispatchEvent(new Event("offline"));
    });

    // Assert
    expect(screen.getByTestId("online")).toHaveTextContent("no");
  });
});
