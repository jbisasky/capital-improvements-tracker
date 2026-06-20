import { describe, it, expect, beforeEach } from "vitest";
import {
  checkBudget,
  checkBudgetForCalls,
  getBudgetSettings,
  resetSessionCounter,
  saveBudgetSettings,
} from "./ai-budget";

describe("ai-budget service", () => {
  beforeEach(() => {
    localStorage.clear();
    resetSessionCounter();
    saveBudgetSettings({
      maxAiCallsPerSession: 3,
      maxAiCallsPerDay: 5,
      maxAiTokensPerDay: 1_000_000,
    });
  });

  it("allows a single call when under limits", () => {
    expect(checkBudget().ok).toBe(true);
    expect(checkBudgetForCalls(1).ok).toBe(true);
  });

  it("rejects batch calls that would exceed the session limit", () => {
    // Arrange
    const budget = getBudgetSettings();

    // Act
    const result = checkBudgetForCalls(budget.maxAiCallsPerSession + 1);

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AI_BUDGET_EXCEEDED");
    }
  });

  it("rejects batch calls that would exceed the daily limit", () => {
    // Arrange
    const budget = getBudgetSettings();

    // Act
    const result = checkBudgetForCalls(budget.maxAiCallsPerDay + 1);

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AI_BUDGET_EXCEEDED");
    }
  });

  it("allows zero batch calls", () => {
    expect(checkBudgetForCalls(0).ok).toBe(true);
  });
});
