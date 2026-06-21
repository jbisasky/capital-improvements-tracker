import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  activateWaitingWorker,
  registerServiceWorker,
  SW_URL,
} from "./register-service-worker";

describe("registerServiceWorker", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when service workers are unavailable", async () => {
    // Arrange
    const original = navigator.serviceWorker;
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: undefined,
    });

    // Act
    const registration = await registerServiceWorker();

    // Assert
    expect(registration).toBeNull();

    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: original,
    });
  });

  it("registers /sw.js when supported", async () => {
    // Arrange
    const register = vi.fn().mockResolvedValue({
      installing: null,
      waiting: null,
      addEventListener: vi.fn(),
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { register },
    });

    // Act
    await registerServiceWorker();

    // Assert
    expect(register).toHaveBeenCalledWith(SW_URL, { scope: "/" });
  });

  it("posts SKIP_WAITING to the waiting worker", () => {
    const postMessage = vi.fn();
    activateWaitingWorker({
      waiting: { postMessage },
    } as unknown as ServiceWorkerRegistration);

    expect(postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
  });
});
