import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { OfflineBanner } from "@/components/layout/offline-banner";
import { OfflineProvider } from "@/services/offline-context";

describe("OfflineBanner", () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });

  it("is hidden while online", () => {
    render(
      <OfflineProvider>
        <OfflineBanner />
      </OfflineProvider>,
    );

    expect(screen.queryByTestId("offline-banner")).not.toBeInTheDocument();
  });

  it("shows the offline message when offline", () => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false,
    });

    render(
      <OfflineProvider>
        <OfflineBanner />
      </OfflineProvider>,
    );

    expect(screen.getByTestId("offline-banner")).toHaveTextContent(/you're offline/i);
  });
});

describe("OfflineBanner accessibility", () => {
  it("has no axe violations when online (banner hidden)", async () => {
    // Arrange
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
    const { container } = render(
      <OfflineProvider>
        <OfflineBanner />
      </OfflineProvider>,
    );

    // Act
    const results = await axe(container);

    // Assert
    expect(results.violations).toEqual([]);
  });

  it("has no axe violations when offline (banner visible)", async () => {
    // Arrange
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: false });
    const { container } = render(
      <OfflineProvider>
        <OfflineBanner />
      </OfflineProvider>,
    );

    // Act
    const results = await axe(container);

    // Assert
    expect(results.violations).toEqual([]);
  });
});
