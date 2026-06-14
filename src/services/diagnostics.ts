/**
 * In-app diagnostics log as a ring buffer (fixed capacity).
 * See LLD §14.7, EARS §25 (DIAG-01–05).
 */

const STORAGE_KEY_DIAGNOSTICS = "app_diagnostics_log";
const MAX_LOG_CAPACITY = 100;

export interface DiagnosticEvent {
  timestamp: string; // ISO 8601 UTC
  code: string;
  context: string;
  counters?: Record<string, number>;
}

/**
 * Retrieve the full diagnostics log (oldest to newest internally).
 * The UI will typically reverse this for display.
 */
export function getDiagnosticsLog(): DiagnosticEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DIAGNOSTICS);
    if (raw != null) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed as DiagnosticEvent[];
      }
    }
  } catch {
    // Corrupted log
  }
  return [];
}

/**
 * Log a new diagnostic event.
 * Evicts the oldest entry if the capacity is exceeded.
 */
export function logDiagnosticEvent(
  code: string,
  context: string,
  counters?: Record<string, number>
): void {
  const logs = getDiagnosticsLog();

  const newEvent: DiagnosticEvent = {
    timestamp: new Date().toISOString(),
    code,
    context,
  };

  if (counters !== undefined) {
    newEvent.counters = counters;
  }

  logs.push(newEvent);

  // Enforce ring buffer capacity
  if (logs.length > MAX_LOG_CAPACITY) {
    logs.splice(0, logs.length - MAX_LOG_CAPACITY);
  }

  try {
    localStorage.setItem(STORAGE_KEY_DIAGNOSTICS, JSON.stringify(logs));
  } catch {
    // Ignore quota errors or disabled localStorage
  }
}

/**
 * Clear all diagnostic logs (useful for tests or user reset).
 */
export function clearDiagnosticsLog(): void {
  localStorage.removeItem(STORAGE_KEY_DIAGNOSTICS);
}

/**
 * Redact sensitive info (tokens, keys, file IDs) from a string.
 * Used for "Copy log".
 */
export function redactSensitiveInfo(text: string): string {
  // Redact potential Bearer tokens
  let redacted = text.replace(/Bearer\s+ya29\.[a-zA-Z0-9_-]+/g, "Bearer [REDACTED]");

  // Redact potential Gemini API keys (usually start with AIza)
  redacted = redacted.replace(/AIza[a-zA-Z0-9_-]{33,}/g, "[REDACTED_API_KEY]");

  // Redact Drive file IDs (typically 33 alphanumeric chars)
  // Use lookarounds to avoid matching our own [REDACTED_...] tags
  redacted = redacted.replace(/(?<!\[)\b[a-zA-Z0-9_-]{33,}\b(?!\])/g, "[REDACTED_FILE_ID]");

  return redacted;
}
