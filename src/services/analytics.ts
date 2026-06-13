/**
 * Plausible Analytics wrapper — thin abstraction so the provider can be
 * swapped without touching feature code. All calls silently no-op when
 * the Plausible script is absent (local dev, ad-blocker, etc.).
 *
 * @see LLD §18, EARS §29 (ANLYT-01–17)
 */

type EventProps = Record<string, string | number | boolean>;

type PlausibleFn = (event: string, options?: { props?: EventProps }) => void;

declare global {
  interface Window {
    plausible?: PlausibleFn;
  }
}

function getPlausible(): PlausibleFn | undefined {
  if (typeof window !== "undefined" && typeof window.plausible === "function") {
    return window.plausible;
  }
  return undefined;
}

export function trackEvent(name: string, props?: EventProps): void {
  const plausible = getPlausible();
  if (plausible) {
    plausible(name, props ? { props } : undefined);
  }
}

// --- Named event helpers (match LLD §18.3 event table) ---

export function trackDemoCTAClicked(): void {
  trackEvent("Demo CTA Clicked");
}

export function trackSignIn(): void {
  trackEvent("Sign In");
}

export function trackProjectCreated(treatment: string): void {
  trackEvent("Project Created", { treatment });
}

export function trackProjectEdited(): void {
  trackEvent("Project Edited");
}

export function trackAIExtractionStarted(): void {
  trackEvent("AI Extraction Started");
}

export function trackAIExtractionAccepted(confidence: string): void {
  trackEvent("AI Extraction Accepted", { confidence });
}

export function trackExport(format: string): void {
  trackEvent("Export", { format });
}

export function trackBYOKKeySaved(expiry: string): void {
  trackEvent("BYOK Key Saved", { expiry });
}

export function trackClearAllData(): void {
  trackEvent("Clear All Data");
}
