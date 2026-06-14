import { describe, it, expect } from "vitest";
import { ok, err, type Result } from "./result";
import { appError } from "./errors";

describe("result pattern", () => {
  it("creates an ok result", () => {
    // Arrange
    const data = "success_data";

    // Act
    const result = ok(data);

    // Assert
    expect(result.ok).toBe(true);
    expect(result.value).toBe(data);
  });

  it("creates an err result with appError", () => {
    // Arrange
    const myErr = appError("VALIDATION_ERROR", "Invalid input", { detail: "missing id" });

    // Act
    const result = err(myErr);

    // Assert
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe("VALIDATION_ERROR");
    expect(result.error.message).toBe("Invalid input");
    expect(result.error.cause).toEqual({ detail: "missing id" });
  });

  it("works with type narrowing", () => {
    // Arrange
    function doSomething(fail: boolean): Result<string> {
      if (fail) return err(appError("UNKNOWN", "failed"));
      return ok("worked");
    }

    // Act
    const pass = doSomething(false);
    const fail = doSomething(true);

    // Assert
    if (pass.ok) {
      // TypeScript knows pass.value exists here
      expect(pass.value).toBe("worked");
    } else {
      // Should not reach here
      expect(true).toBe(false);
    }

    if (!fail.ok) {
      // TypeScript knows fail.error exists here
      expect(fail.error.code).toBe("UNKNOWN");
    } else {
       // Should not reach here
       expect(true).toBe(false);
    }
  });
});