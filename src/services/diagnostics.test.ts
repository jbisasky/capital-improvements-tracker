import { describe, it, expect, beforeEach } from "vitest";
import {
  logDiagnosticEvent,
  getDiagnosticsLog,
  clearDiagnosticsLog,
  redactSensitiveInfo,
} from "./diagnostics";

describe("Diagnostics Service", () => {
  beforeEach(() => {
    // Arrange: clear localStorage before each test
    clearDiagnosticsLog();
  });

  it("should log a diagnostic event and retrieve it", () => {
    // Arrange
    const code = "TEST_EVENT";
    const context = "This is a test event";
    const counters = { count: 1 };

    // Act
    logDiagnosticEvent(code, context, counters);
    const logs = getDiagnosticsLog();

    // Assert
    expect(logs.length).toBe(1);
    expect(logs[0]?.code).toBe(code);
    expect(logs[0]?.context).toBe(context);
    expect(logs[0]?.counters).toEqual(counters);
    expect(logs[0]?.timestamp).toBeDefined();
  });

  it("should evict the oldest entries when exceeding capacity", () => {
    // Arrange
    const capacity = 100;

    // Act
    for (let i = 0; i < capacity + 5; i++) {
      logDiagnosticEvent(`EVENT_${String(i)}`, `Context for event ${String(i)}`);
    }

    const logs = getDiagnosticsLog();

    // Assert
    expect(logs.length).toBe(capacity);
    // The oldest 5 entries should have been evicted
    expect(logs[0]?.code).toBe("EVENT_5");
    expect(logs[capacity - 1]?.code).toBe(`EVENT_${String(capacity + 4)}`);
  });

  it("should clear the diagnostics log", () => {
    // Arrange
    logDiagnosticEvent("EVENT_1", "Context 1");
    logDiagnosticEvent("EVENT_2", "Context 2");

    // Act
    clearDiagnosticsLog();
    const logs = getDiagnosticsLog();

    // Assert
    expect(logs.length).toBe(0);
  });

  describe("redactSensitiveInfo", () => {
    it("should redact Bearer tokens", () => {
      // Arrange
      const text = "Error fetching data: Bearer ya29.a0AfB_byA was invalid";

      // Act
      const redacted = redactSensitiveInfo(text);

      // Assert
      expect(redacted).toBe("Error fetching data: Bearer [REDACTED] was invalid");
    });

    it("should redact Gemini API keys", () => {
      // Arrange
      const text = "Using BYOK key AIzaSyD_this_is_a_mock_key_1234567890 for extraction";

      // Act
      const redacted = redactSensitiveInfo(text);

      // Assert
      expect(redacted).toBe("Using BYOK key [REDACTED_API_KEY] for extraction");
    });

    it("should redact Google Drive file IDs", () => {
      // Arrange
      const text = "Conflict updating file 1abcd2EFGH3ijkl4MNOP5qrst6UVWX7yzA";

      // Act
      const redacted = redactSensitiveInfo(text);

      // Assert
      expect(redacted).toBe("Conflict updating file [REDACTED_FILE_ID]");
    });

    it("should leave safe text unchanged", () => {
      // Arrange
      const text = "AI_BUDGET_EXCEEDED: Session AI call limit reached (50).";

      // Act
      const redacted = redactSensitiveInfo(text);

      // Assert
      expect(redacted).toBe(text);
    });
  });
});
