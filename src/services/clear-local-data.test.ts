import { describe, expect, it, vi, beforeEach } from "vitest";
import { clearLocalDeviceData } from "./clear-local-data";
import { deleteAllCaches } from "./pwa-cache";
import { clearManifestCache } from "./offline-manifest-cache";

vi.mock("./pwa-cache", () => ({
  deleteAllCaches: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./offline-manifest-cache", () => ({
  clearManifestCache: vi.fn().mockResolvedValue(undefined),
}));

describe("clearLocalDeviceData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("test-key", "value");
  });

  it("clears localStorage, manifest cache, and service worker registrations", async () => {
    // Arrange
    const unregister = vi.fn().mockResolvedValue(true);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        getRegistrations: vi.fn().mockResolvedValue([{ unregister }]),
      },
    });

    // Act
    await clearLocalDeviceData();

    // Assert
    expect(localStorage.getItem("test-key")).toBeNull();
    expect(clearManifestCache).toHaveBeenCalled();
    expect(deleteAllCaches).toHaveBeenCalled();
    expect(unregister).toHaveBeenCalled();
  });
});
