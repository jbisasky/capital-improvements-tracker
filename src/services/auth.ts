/**
 * PKCE OAuth2 flow — manages auth state, redirect-based sign-in, token
 * exchange, silent refresh via prompt=none, and sign-out.
 * Token is held in memory only (never persisted). See LLD §4.
 *
 * Flow:
 *  1. signIn()        — generates code_verifier/challenge, stores verifier in
 *                       sessionStorage, redirects to Google's auth endpoint.
 *  2. /auth/callback  — Google redirects back with ?code=&state=
 *  3. handleRedirectCallback() — called on app mount; exchanges code for token
 *                       via fetch to token endpoint; clears sessionStorage.
 */

const REQUIRED_SCOPES = [
  "https://www.googleapis.com/auth/drive.appdata",
  "https://www.googleapis.com/auth/drive.file",
];

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REDIRECT_PATH = "/auth/callback";
const VERIFIER_KEY = "pkce_verifier";
const STATE_KEY = "pkce_state";
const REFRESH_MARGIN_MS = 60_000; // refresh 60 s before expiry

export type AuthStatus =
  | "unauthenticated"
  | "authenticating"
  | "authenticated"
  | "refreshing"
  | "needs_interaction";

export interface AuthState {
  status: AuthStatus;
  accessToken: string | null;
  expiresAt: number | null;
  error: string | null;
}

export type AuthListener = (state: AuthState) => void;

const INITIAL_STATE: AuthState = {
  status: "unauthenticated",
  accessToken: null,
  expiresAt: null,
  error: null,
};

let clientId = "";
let state: AuthState = { ...INITIAL_STATE };
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<AuthListener>();
// Guards against React StrictMode double-invoking the callback exchange.
let callbackHandled = false;

/** Reset module-level state — for testing only. */
export function _resetForTesting(): void {
  callbackHandled = false;
  clientId = "";
  state = { ...INITIAL_STATE };
  clearRefreshTimer();
  listeners.clear();
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function notify(): void {
  for (const listener of listeners) {
    listener(state);
  }
}

function clearRefreshTimer(): void {
  if (refreshTimer != null) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

function scheduleRefresh(): void {
  clearRefreshTimer();
  if (state.expiresAt == null) return;
  const delay = Math.max(0, state.expiresAt - Date.now() - REFRESH_MARGIN_MS);
  refreshTimer = setTimeout(() => {
    void silentRefresh();
  }, delay);
}

/** Returns the full redirect URI for the current origin. */
function redirectUri(): string {
  return `${window.location.origin}${REDIRECT_PATH}`;
}

// ---------------------------------------------------------------------------
// PKCE crypto helpers (exported for testing)
// ---------------------------------------------------------------------------

/** Generate a cryptographically random base64url string of `byteLength` bytes. */
export function generateRandomBase64url(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64urlEncode(bytes);
}

export function base64urlEncode(buffer: Uint8Array): string {
  let str = "";
  for (const byte of buffer) {
    str += String.fromCharCode(byte);
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/** SHA-256 of the verifier, returned as a base64url string. */
export async function computeCodeChallenge(verifier: string): Promise<string> {
  const encoded = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return base64urlEncode(new Uint8Array(digest));
}

// ---------------------------------------------------------------------------
// Token response handling
// ---------------------------------------------------------------------------

interface RawTokenResponse {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

function applyTokenResponse(raw: RawTokenResponse): void {
  if (raw.error != null || raw.access_token == null) {
    state = {
      status: "needs_interaction",
      accessToken: null,
      expiresAt: null,
      error: raw.error_description ?? raw.error ?? "Unknown token error",
    };
    notify();
    return;
  }

  const grantedScopes = new Set((raw.scope ?? "").split(" "));
  const missing = REQUIRED_SCOPES.filter((s) => !grantedScopes.has(s));
  if (missing.length > 0) {
    state = {
      status: "needs_interaction",
      accessToken: null,
      expiresAt: null,
      error: `Missing required scopes: ${missing.join(", ")}`,
    };
    notify();
    return;
  }

  state = {
    status: "authenticated",
    accessToken: raw.access_token,
    expiresAt: Date.now() + ((raw.expires_in ?? 3600) - 60) * 1000,
    error: null,
  };
  notify();
  scheduleRefresh();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function initAuth(id: string): void {
  clientId = id;
}

/** Redirect the browser to Google's OAuth2 authorization endpoint. */
export function signIn(): void {
  if (clientId === "") return;

  const verifier = generateRandomBase64url(64);
  const oauthState = generateRandomBase64url(16);

  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, oauthState);

  state = { ...state, status: "authenticating", error: null };
  notify();

  void computeCodeChallenge(verifier).then((challenge) => {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri(),
      response_type: "code",
      scope: REQUIRED_SCOPES.join(" "),
      code_challenge: challenge,
      code_challenge_method: "S256",
      state: oauthState,
      access_type: "online",
      prompt: "consent",
    });
    window.location.href = `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
  });
}

/**
 * Call once on app mount (inside AuthProvider). If the current URL looks like
 * an OAuth callback (?code=...) it exchanges the code for a token, then
 * navigates to /dashboard (or the path stored before redirect).
 *
 * Returns true if a callback was handled, false otherwise.
 */
export async function handleRedirectCallback(): Promise<boolean> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const returnedState = params.get("state");
  const error = params.get("error");

  // Not a callback URL — nothing to do.
  if (code == null && error == null) return false;

  // Prevent React StrictMode double-invoke from consuming the auth code twice.
  if (callbackHandled) {
    console.debug("[auth] callback already handled, skipping");
    return true;
  }
  callbackHandled = true;

  const storedState = sessionStorage.getItem(STATE_KEY);
  const verifier = sessionStorage.getItem(VERIFIER_KEY);

  console.debug("[auth] callback received", {
    hasCode: code != null,
    hasError: error != null,
    returnedState,
    storedState,
    hasVerifier: verifier != null,
    clientId: clientId !== "" ? "set" : "EMPTY",
  });

  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);

  // CSRF check
  if (returnedState == null || returnedState !== storedState) {
    state = {
      status: "unauthenticated",
      accessToken: null,
      expiresAt: null,
      error: "OAuth state mismatch — possible CSRF. Please try signing in again.",
    };
    notify();
    return true;
  }

  if (error != null || code == null || verifier == null) {
    state = {
      status: "unauthenticated",
      accessToken: null,
      expiresAt: null,
      error: params.get("error_description") ?? error ?? "Sign-in was cancelled.",
    };
    notify();
    return true;
  }

  // Exchange code for token
  state = { ...state, status: "authenticating" };
  notify();

  try {
    const body = new URLSearchParams({
      client_id: clientId,
      code,
      code_verifier: verifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri(),
    });

    console.debug("[auth] token request body", Object.fromEntries(body));

    const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const raw = (await res.json()) as RawTokenResponse;
    console.debug("[auth] token response", { status: res.status, error: raw.error, error_description: raw.error_description, hasToken: raw.access_token != null });
    applyTokenResponse(raw);
  } catch (err) {
    state = {
      status: "unauthenticated",
      accessToken: null,
      expiresAt: null,
      error: err instanceof Error ? err.message : "Token exchange failed.",
    };
    notify();
  }

  return true;
}

/** Attempt a silent token refresh using prompt=none (best-effort). */
async function silentRefresh(): Promise<void> {
  if (clientId === "") return;

  state = { ...state, status: "refreshing" };
  notify();

  // PKCE silent refresh: redirect with prompt=none is not reliable in SPAs
  // because we can't intercept a redirect in a background context.
  // Instead we signal needs_interaction so the user is prompted to sign in.
  state = {
    status: "needs_interaction",
    accessToken: null,
    expiresAt: null,
    error: null,
  };
  notify();
}

export function signOut(): void {
  clearRefreshTimer();
  const token = state.accessToken;
  state = { ...INITIAL_STATE };
  notify();

  if (token != null) {
    // Best-effort revocation — GIS revoke endpoint works without the library.
    void fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
      method: "POST",
    }).catch(() => {
      // ignore revocation errors
    });
  }
}

export function getAuthState(): AuthState {
  return state;
}

export function getAccessToken(): string | null {
  if (state.status !== "authenticated" || state.accessToken == null) return null;
  if (state.expiresAt != null && Date.now() >= state.expiresAt) return null;
  return state.accessToken;
}

export function ensureFreshToken(): Promise<string | null> {
  const token = getAccessToken();
  if (token != null) return Promise.resolve(token);
  // With PKCE redirect flow we can't silently obtain a token in the background.
  // Callers should check auth status and redirect to sign-in if needed.
  return Promise.resolve(null);
}

export function subscribe(listener: AuthListener): void {
  listeners.add(listener);
}

export function unsubscribe(listener: AuthListener): void {
  listeners.delete(listener);
}
