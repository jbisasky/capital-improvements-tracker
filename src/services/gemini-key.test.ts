import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getGeminiKey,
  hasGeminiKey,
  saveGeminiKey,
  clearGeminiKey,
  getKeyExpiry,
  isSessionOnly,
} from "./gemini-key";

describe("gemini-key service", () => {
  beforeEach(() => {
    // Clear localStorage and any potential in-memory state before each test
    localStorage.clear();
    clearGeminiKey();

    // Reset date mock if used
    vi.useRealTimers();
  });

  afterEach(() => {
    localStorage.clear();
    clearGeminiKey();
    vi.restoreAllMocks();
  });

  it("should return null initially", () => {
    expect(getGeminiKey()).toBeNull();
    expect(hasGeminiKey()).toBe(false);
  });

  it("should save and retrieve a session-only key", () => {
    saveGeminiKey("test-session-key", { expiryDays: 30, sessionOnly: true });

    expect(getGeminiKey()).toBe("test-session-key");
    expect(hasGeminiKey()).toBe(true);
    expect(isSessionOnly()).toBe(true);

    // Ensure it's not in localStorage
    expect(localStorage.getItem("byok_gemini_key")).toBeNull();
  });

  it("should save and retrieve a persistent key", () => {
    saveGeminiKey("test-persistent-key", { expiryDays: 7, sessionOnly: false });

    expect(getGeminiKey()).toBe("test-persistent-key");
    expect(hasGeminiKey()).toBe(true);
    expect(isSessionOnly()).toBe(false);
    expect(getKeyExpiry()).toBe(7);

    // Ensure it is in localStorage
    expect(localStorage.getItem("byok_gemini_key")).toBe("test-persistent-key");
  });

  it("should clear keys correctly", () => {
    saveGeminiKey("test-key", { expiryDays: 30, sessionOnly: false });
    expect(hasGeminiKey()).toBe(true);

    clearGeminiKey();

    expect(getGeminiKey()).toBeNull();
    expect(hasGeminiKey()).toBe(false);
    expect(isSessionOnly()).toBe(false);
    expect(localStorage.getItem("byok_gemini_key")).toBeNull();
  });

  it("should handle expired keys correctly", () => {
    vi.useFakeTimers();

    saveGeminiKey("test-expired-key", { expiryDays: 7, sessionOnly: false });
    expect(hasGeminiKey()).toBe(true);

    // Advance time by 8 days (1 day past expiry)
    vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);

    expect(getGeminiKey()).toBeNull(); // Should clear and return null
    expect(hasGeminiKey()).toBe(false);

    // Should have cleared localStorage as well
    expect(localStorage.getItem("byok_gemini_key")).toBeNull();
  });

  it("should not expire keys if expiryDays is null", () => {
    vi.useFakeTimers();

    saveGeminiKey("test-no-expiry-key", { expiryDays: null, sessionOnly: false });
    expect(hasGeminiKey()).toBe(true);

    // Advance time by a very long time (e.g., 100 years)
    vi.advanceTimersByTime(100 * 365 * 24 * 60 * 60 * 1000);

    expect(getGeminiKey()).toBe("test-no-expiry-key");
    expect(hasGeminiKey()).toBe(true);
  });
});
