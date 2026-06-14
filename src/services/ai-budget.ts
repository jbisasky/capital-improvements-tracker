/**
 * AI usage budget tracking — per-session + daily counters.
 * See LLD §14.5.
 */

import { type Result, ok, err } from "@/domain/result";
import { appError } from "@/domain/errors";

const STORAGE_KEY_DAILY = "ai_budget_daily";
const STORAGE_KEY_SETTINGS = "ai_budget_settings";

export interface UsageBudget {
  maxAiCallsPerSession: number;
  maxAiCallsPerDay: number;
  maxAiTokensPerDay: number;
}

interface DailyUsage {
  date: string; // YYYY-MM-DD UTC
  calls: number;
  tokens: number;
}

const DEFAULT_BUDGET: UsageBudget = {
  maxAiCallsPerSession: 50,
  maxAiCallsPerDay: 200,
  maxAiTokensPerDay: 2_000_000,
};

let sessionCalls = 0;

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDailyUsage(): DailyUsage {
  const raw = localStorage.getItem(STORAGE_KEY_DAILY);
  if (raw != null) {
    try {
      const parsed = JSON.parse(raw) as DailyUsage;
      if (parsed.date === todayUTC()) return parsed;
    } catch {
      // Corrupted — reset
    }
  }
  return { date: todayUTC(), calls: 0, tokens: 0 };
}

function saveDailyUsage(usage: DailyUsage): void {
  localStorage.setItem(STORAGE_KEY_DAILY, JSON.stringify(usage));
}

/** Get user-configured budget limits. */
export function getBudgetSettings(): UsageBudget {
  const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
  if (raw != null) {
    try {
      return { ...DEFAULT_BUDGET, ...(JSON.parse(raw) as Partial<UsageBudget>) };
    } catch {
      // Fall through to default
    }
  }
  return DEFAULT_BUDGET;
}

/** Save user-configured budget limits. */
export function saveBudgetSettings(settings: Partial<UsageBudget>): void {
  const current = getBudgetSettings();
  localStorage.setItem(
    STORAGE_KEY_SETTINGS,
    JSON.stringify({ ...current, ...settings }),
  );
}

/** Check if the budget allows another AI call. Returns ok(void) or err. */
export function checkBudget(): Result<void> {
  const budget = getBudgetSettings();
  const daily = getDailyUsage();

  if (sessionCalls >= budget.maxAiCallsPerSession) {
    return err(
      appError(
        "AI_BUDGET_EXCEEDED",
        `Session AI call limit reached (${String(budget.maxAiCallsPerSession)}). Restart the app or raise the limit in Settings.`,
      ),
    );
  }

  if (daily.calls >= budget.maxAiCallsPerDay) {
    return err(
      appError(
        "AI_BUDGET_EXCEEDED",
        `Daily AI call limit reached (${String(budget.maxAiCallsPerDay)}). Try again tomorrow or raise the limit in Settings.`,
      ),
    );
  }

  if (daily.tokens >= budget.maxAiTokensPerDay) {
    return err(
      appError(
        "AI_BUDGET_EXCEEDED",
        `Daily AI token limit reached (${String(budget.maxAiTokensPerDay).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}). Try again tomorrow or raise the limit in Settings.`,
      ),
    );
  }

  return ok(undefined);
}

/** Record a completed AI call with token usage. */
export function recordUsage(tokens: number): void {
  sessionCalls++;
  const daily = getDailyUsage();
  daily.calls++;
  daily.tokens += tokens;
  saveDailyUsage(daily);
}

/** Get current usage counters for display. */
export function getUsageCounters(): {
  sessionCalls: number;
  dailyCalls: number;
  dailyTokens: number;
} {
  const daily = getDailyUsage();
  return {
    sessionCalls,
    dailyCalls: daily.calls,
    dailyTokens: daily.tokens,
  };
}

/** Reset session counter (for testing). */
export function resetSessionCounter(): void {
  sessionCalls = 0;
}
