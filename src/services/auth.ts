/**
 * GIS OAuth2 token client — manages auth state, silent refresh, and sign-out.
 * Token is held in memory only (never persisted). See LLD §4.
 */

import { type TokenClient, type TokenResponse, type GisError } from "@/services/gis-types";

const REQUIRED_SCOPES = [
  "https://www.googleapis.com/auth/drive.appdata",
  "https://www.googleapis.com/auth/drive.file",
];

const REFRESH_MARGIN_MS = 60_000; // refresh 60s before expiry

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

let state: AuthState = { ...INITIAL_STATE };
let tokenClient: TokenClient | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<AuthListener>();

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
    silentRefresh();
  }, delay);
}

function handleTokenResponse(response: TokenResponse): void {
  if (response.error != null) {
    state = {
      status: "needs_interaction",
      accessToken: null,
      expiresAt: null,
      error: response.error_description ?? response.error,
    };
    notify();
    return;
  }

  const grantedScopes = new Set(response.scope.split(" "));
  const missingScopes = REQUIRED_SCOPES.filter((s) => !grantedScopes.has(s));
  if (missingScopes.length > 0) {
    state = {
      status: "needs_interaction",
      accessToken: null,
      expiresAt: null,
      error: `Missing required scopes: ${missingScopes.join(", ")}`,
    };
    notify();
    return;
  }

  state = {
    status: "authenticated",
    accessToken: response.access_token,
    expiresAt: Date.now() + (response.expires_in - 60) * 1000,
    error: null,
  };
  notify();
  scheduleRefresh();
}

function handleTokenError(error: GisError): void {
  if (state.status === "refreshing") {
    state = {
      status: "needs_interaction",
      accessToken: null,
      expiresAt: null,
      error: error.message ?? error.type,
    };
  } else {
    state = {
      status: "unauthenticated",
      accessToken: null,
      expiresAt: null,
      error: error.message ?? error.type,
    };
  }
  notify();
}

export function initAuth(clientId: string): void {
  const google = window.google;
  if (google == null) {
    return;
  }

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: REQUIRED_SCOPES.join(" "),
    prompt: "",
    callback: handleTokenResponse,
    error_callback: handleTokenError,
  });
}

export function signIn(): void {
  if (tokenClient == null) return;

  state = { ...state, status: "authenticating", error: null };
  notify();
  tokenClient.requestAccessToken({ prompt: "consent" });
}

function silentRefresh(): void {
  if (tokenClient == null) return;

  state = { ...state, status: "refreshing" };
  notify();
  tokenClient.requestAccessToken({ prompt: "" });
}

export function signOut(): void {
  clearRefreshTimer();
  const token = state.accessToken;

  state = { ...INITIAL_STATE };
  notify();

  if (token != null) {
    window.google?.accounts.oauth2.revoke(token, () => {
      // best-effort revocation; local state already cleared
    });
  }
}

export function getAuthState(): AuthState {
  return state;
}

export function getAccessToken(): string | null {
  if (state.status !== "authenticated" || state.accessToken == null) {
    return null;
  }
  if (state.expiresAt != null && Date.now() >= state.expiresAt) {
    return null;
  }
  return state.accessToken;
}

export function ensureFreshToken(): Promise<string | null> {
  const token = getAccessToken();
  if (token != null) return Promise.resolve(token);

  if (tokenClient == null) return Promise.resolve(null);

  return new Promise<string | null>((resolve) => {
    const listener: AuthListener = (newState) => {
      if (newState.status === "authenticated" && newState.accessToken != null) {
        unsubscribe(listener);
        resolve(newState.accessToken);
      } else if (
        newState.status === "unauthenticated" ||
        newState.status === "needs_interaction"
      ) {
        unsubscribe(listener);
        resolve(null);
      }
    };
    subscribe(listener);
    silentRefresh();
  });
}

export function subscribe(listener: AuthListener): void {
  listeners.add(listener);
}

export function unsubscribe(listener: AuthListener): void {
  listeners.delete(listener);
}
