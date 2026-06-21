import { describe, expect, it } from "vitest";
import {
  OFFLINE_ERROR_CODE,
  OFFLINE_WRITE_MESSAGE,
  isOfflineWriteError,
  offlineWriteResult,
} from "./offline-error";

describe("offline-error", () => {
  it("returns a typed OFFLINE result for write guards", () => {
    // Act
    const result = offlineWriteResult();

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(OFFLINE_ERROR_CODE);
      expect(result.error.message).toBe(OFFLINE_WRITE_MESSAGE);
    }
  });

  it("identifies offline write errors", () => {
    expect(isOfflineWriteError({ code: OFFLINE_ERROR_CODE })).toBe(true);
    expect(isOfflineWriteError({ code: "OTHER" })).toBe(false);
  });
});
