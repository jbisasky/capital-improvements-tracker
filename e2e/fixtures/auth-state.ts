import { type Page } from "@playwright/test";

export const FAKE_TOKEN = "e2e-fake-token";
export const FAKE_FILE_ID = "e2e-manifest-file-id";
export const FAKE_REVISION_ID = "e2e-revision-id-1";

/**
 * Seed a valid (non-expired) auth token into sessionStorage before the page
 * loads. Must be called before page.goto() so that initAuth() picks it up on
 * module load.
 */
export async function seedAuthToken(page: Page): Promise<void> {
  const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour from now
  await page.addInitScript(
    ({ token, expiry }: { token: string; expiry: number }) => {
      sessionStorage.setItem("auth_access_token", token);
      sessionStorage.setItem("auth_expires_at", String(expiry));
    },
    { token: FAKE_TOKEN, expiry: expiresAt },
  );
}

/**
 * Seed an already-expired token into sessionStorage. initAuth() will detect
 * it as expired, clear it, and leave the user unauthenticated.
 */
export async function seedExpiredToken(page: Page): Promise<void> {
  const expiresAt = Date.now() - 1000; // 1 second in the past
  await page.addInitScript(
    ({ token, expiry }: { token: string; expiry: number }) => {
      sessionStorage.setItem("auth_access_token", token);
      sessionStorage.setItem("auth_expires_at", String(expiry));
    },
    { token: FAKE_TOKEN, expiry: expiresAt },
  );
}

/**
 * Seed a valid BYOK Gemini API key into localStorage before the page loads.
 * Key names must match gemini-key.ts: STORAGE_KEY and STORAGE_META_KEY.
 * Must be called before page.goto().
 */
export async function seedGeminiKey(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("byok_gemini_key", "AIzaSy_e2e_test_key");
    localStorage.setItem(
      "byok_gemini_meta",
      JSON.stringify({ storedAt: new Date().toISOString(), expiryDays: 30, sessionOnly: false }),
    );
  });
}

/**
 * Seed the PKCE state and verifier keys that handleRedirectCallback() reads
 * when processing an OAuth callback URL. Must be called before page.goto().
 */
export async function seedPkceState(
  page: Page,
  state: string,
  verifier: string,
): Promise<void> {
  await page.addInitScript(
    ({ pkceState, pkceVerifier }: { pkceState: string; pkceVerifier: string }) => {
      sessionStorage.setItem("pkce_state", pkceState);
      sessionStorage.setItem("pkce_verifier", pkceVerifier);
    },
    { pkceState: state, pkceVerifier: verifier },
  );
}
