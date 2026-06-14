/**
 * BYOK Gemini API key management — localStorage with auto-expiry.
 * See LLD §13.1.
 */

const STORAGE_KEY = "byok_gemini_key";
const STORAGE_META_KEY = "byok_gemini_meta";

export type ExpiryDays = 7 | 30 | 90 | null;

interface ByokMeta {
  storedAt: string;
  expiryDays: ExpiryDays;
  sessionOnly: boolean;
}

let sessionKey: string | null = null;

function getMeta(): ByokMeta | null {
  const raw = localStorage.getItem(STORAGE_META_KEY);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as ByokMeta;
  } catch {
    return null;
  }
}

function isExpired(meta: ByokMeta): boolean {
  if (meta.expiryDays == null) return false;
  const storedAt = new Date(meta.storedAt).getTime();
  const now = Date.now();
  const expiryMs = meta.expiryDays * 24 * 60 * 60 * 1000;
  return now - storedAt > expiryMs;
}

/** Retrieve the current BYOK key (or null if absent/expired). */
export function getGeminiKey(): string | null {
  // Session-only key takes precedence
  if (sessionKey != null) return sessionKey;

  const meta = getMeta();
  if (meta == null) return null;

  if (meta.sessionOnly) {
    // Session-only keys are never stored persistently — shouldn't hit this
    return null;
  }

  if (isExpired(meta)) {
    clearGeminiKey();
    return null;
  }

  return localStorage.getItem(STORAGE_KEY);
}

/** Returns true if the key exists and is valid (not expired). */
export function hasGeminiKey(): boolean {
  return getGeminiKey() != null;
}

/** Save the BYOK key. */
export function saveGeminiKey(
  key: string,
  options: { expiryDays: ExpiryDays; sessionOnly: boolean },
): void {
  if (options.sessionOnly) {
    sessionKey = key;
    // Don't persist to localStorage
    return;
  }

  sessionKey = null;
  localStorage.setItem(STORAGE_KEY, key);
  const meta: ByokMeta = {
    storedAt: new Date().toISOString(),
    expiryDays: options.expiryDays,
    sessionOnly: false,
  };
  localStorage.setItem(STORAGE_META_KEY, JSON.stringify(meta));
}

/** Remove the stored key. */
export function clearGeminiKey(): void {
  sessionKey = null;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_META_KEY);
}

/** Get the current expiry configuration. */
export function getKeyExpiry(): ExpiryDays {
  const meta = getMeta();
  return meta?.expiryDays ?? 30;
}

/** Check if current key is session-only. */
export function isSessionOnly(): boolean {
  return sessionKey != null;
}
