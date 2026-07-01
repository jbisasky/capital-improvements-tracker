/**
 * Theme preference — light/dark/system, persisted to localStorage.
 *
 * This is a device-local display preference (like the BYOK key in
 * gemini-key.ts and AI budget limits in ai-budget.ts), not domain data, so
 * it is intentionally kept out of manifest.json rather than synced via
 * Drive.
 */

export const THEME_STORAGE_KEY = "theme_preference";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const VALID_PREFERENCES: readonly ThemePreference[] = ["light", "dark", "system"];

function isThemePreference(value: string): value is ThemePreference {
  return (VALID_PREFERENCES as readonly string[]).includes(value);
}

/** Get the user's stored theme preference (defaults to "system"). */
export function getThemePreference(): ThemePreference {
  const raw = localStorage.getItem(THEME_STORAGE_KEY);
  if (raw != null && isThemePreference(raw)) return raw;
  return "system";
}

/** Persist the user's theme preference. */
export function saveThemePreference(preference: ThemePreference): void {
  localStorage.setItem(THEME_STORAGE_KEY, preference);
}

/** Whether the OS/browser currently prefers a dark color scheme. */
export function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Resolve a preference ("system" included) to the theme that should be rendered. */
export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "system") return systemPrefersDark() ? "dark" : "light";
  return preference;
}

/** Apply the resolved theme by toggling the `.dark` class on <html>. */
export function applyResolvedTheme(resolved: ResolvedTheme): void {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}
