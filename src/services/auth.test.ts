import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import {
  base64urlEncode,
  computeCodeChallenge,
  generateRandomBase64url,
  handleRedirectCallback,
  initAuth,
  getAuthState,
  signOut,
  subscribe,
  unsubscribe,
  _resetForTesting,
  type AuthState,
} from "@/services/auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setUrl(search: string): void {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, search, origin: "https://example.com" },
  });
}

// ---------------------------------------------------------------------------
// base64urlEncode
// ---------------------------------------------------------------------------

describe("base64urlEncode", () => {
  it("produces no padding characters", () => {
    // Arrange
    const bytes = new Uint8Array([0, 1, 2, 3, 4]);

    // Act
    const result = base64urlEncode(bytes);

    // Assert
    expect(result).not.toContain("=");
    expect(result).not.toContain("+");
    expect(result).not.toContain("/");
  });

  it("encodes empty buffer to empty string", () => {
    expect(base64urlEncode(new Uint8Array([]))).toBe("");
  });

  it("is URL-safe (only [A-Za-z0-9_-] chars)", () => {
    // Arrange — run many random buffers
    for (let i = 0; i < 20; i++) {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      const result = base64urlEncode(bytes);
      expect(result).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });
});

// ---------------------------------------------------------------------------
// generateRandomBase64url
// ---------------------------------------------------------------------------

describe("generateRandomBase64url", () => {
  it("returns a non-empty string", () => {
    expect(generateRandomBase64url(32).length).toBeGreaterThan(0);
  });

  it("returns different values on each call", () => {
    const a = generateRandomBase64url(32);
    const b = generateRandomBase64url(32);
    expect(a).not.toBe(b);
  });
});

// ---------------------------------------------------------------------------
// computeCodeChallenge
// ---------------------------------------------------------------------------

describe("computeCodeChallenge", () => {
  it("returns a base64url string", async () => {
    // Arrange
    const verifier = generateRandomBase64url(64);

    // Act
    const challenge = await computeCodeChallenge(verifier);

    // Assert
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(challenge.length).toBeGreaterThan(0);
  });

  it("is deterministic for the same verifier", async () => {
    // Arrange
    const verifier = "test-verifier-abc123";

    // Act
    const a = await computeCodeChallenge(verifier);
    const b = await computeCodeChallenge(verifier);

    // Assert
    expect(a).toBe(b);
  });

  it("produces different challenges for different verifiers", async () => {
    const a = await computeCodeChallenge("verifier-one");
    const b = await computeCodeChallenge("verifier-two");
    expect(a).not.toBe(b);
  });
});

// ---------------------------------------------------------------------------
// handleRedirectCallback
// ---------------------------------------------------------------------------

describe("handleRedirectCallback", () => {
  beforeEach(() => {
    // Reset all module-level state (including callbackHandled guard) between tests
    _resetForTesting();
    initAuth("test-client-id");
    sessionStorage.clear();
    setUrl("");
    vi.restoreAllMocks();
  });

  it("returns false when URL has no code or error params", async () => {
    // Arrange
    setUrl("?foo=bar");

    // Act
    const handled = await handleRedirectCallback();

    // Assert
    expect(handled).toBe(false);
  });

  it("sets error state when OAuth state param is missing from sessionStorage", async () => {
    // Arrange — simulate Google redirect but no stored state (CSRF)
    setUrl("?code=abc&state=random-state");
    // Do NOT set sessionStorage STATE_KEY

    // Act
    const handled = await handleRedirectCallback();

    // Assert
    expect(handled).toBe(true);
    expect(getAuthState().status).toBe("unauthenticated");
    expect(getAuthState().error).toMatch(/state mismatch/i);
  });

  it("sets error state when returned state does not match stored state", async () => {
    // Arrange
    sessionStorage.setItem("pkce_state", "stored-state");
    sessionStorage.setItem("pkce_verifier", "some-verifier");
    setUrl("?code=abc&state=different-state");

    // Act
    await handleRedirectCallback();

    // Assert
    expect(getAuthState().status).toBe("unauthenticated");
    expect(getAuthState().error).toMatch(/state mismatch/i);
  });

  it("sets error state when Google returns an error param", async () => {
    // Arrange
    const oauthState = "valid-state";
    sessionStorage.setItem("pkce_state", oauthState);
    sessionStorage.setItem("pkce_verifier", "verifier");
    setUrl(`?error=access_denied&error_description=User+denied&state=${oauthState}`);

    // Act
    await handleRedirectCallback();

    // Assert
    expect(getAuthState().status).toBe("unauthenticated");
    expect(getAuthState().error).toContain("User denied");
  });

  it("calls token endpoint and sets authenticated state on success", async () => {
    // Arrange
    const oauthState = "valid-state";
    sessionStorage.setItem("pkce_state", oauthState);
    sessionStorage.setItem("pkce_verifier", "my-verifier");
    setUrl(`?code=auth-code-123&state=${oauthState}`);

    const mockFetch = vi.fn().mockResolvedValue({
      json: async () => ({
        access_token: "tok_abc",
        expires_in: 3600,
        scope: [
          "https://www.googleapis.com/auth/drive.appdata",
          "https://www.googleapis.com/auth/drive.file",
        ].join(" "),
        token_type: "Bearer",
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const states: AuthState[] = [];
    const listener = (s: AuthState): void => { states.push({ ...s }); };
    subscribe(listener);

    // Act
    const handled = await handleRedirectCallback();
    unsubscribe(listener);

    // Assert
    expect(handled).toBe(true);
    expect(getAuthState().status).toBe("authenticated");
    expect(getAuthState().accessToken).toBe("tok_abc");

    // Verify token endpoint was called with correct params
    const [url, options] = (mockFetch as Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://oauth2.googleapis.com/token");
    expect(options.method).toBe("POST");
    const body = new URLSearchParams(options.body as string);
    expect(body.get("code")).toBe("auth-code-123");
    expect(body.get("code_verifier")).toBe("my-verifier");
    expect(body.get("grant_type")).toBe("authorization_code");
  });

  it("sets needs_interaction when token response is missing required scopes", async () => {
    // Arrange
    const oauthState = "valid-state";
    sessionStorage.setItem("pkce_state", oauthState);
    sessionStorage.setItem("pkce_verifier", "verifier");
    setUrl(`?code=code&state=${oauthState}`);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      json: async () => ({
        access_token: "tok",
        expires_in: 3600,
        // Only one scope — missing drive.file
        scope: "https://www.googleapis.com/auth/drive.appdata",
        token_type: "Bearer",
      }),
    }));

    // Act
    await handleRedirectCallback();

    // Assert
    expect(getAuthState().status).toBe("needs_interaction");
    expect(getAuthState().error).toMatch(/missing required scopes/i);
  });

  it("clears sessionStorage after handling callback", async () => {
    // Arrange
    sessionStorage.setItem("pkce_state", "s");
    sessionStorage.setItem("pkce_verifier", "v");
    setUrl("?code=c&state=s");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      json: async () => ({ access_token: "t", expires_in: 3600, scope: "https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file", token_type: "Bearer" }),
    }));

    // Act
    await handleRedirectCallback();

    // Assert
    expect(sessionStorage.getItem("pkce_verifier")).toBeNull();
    expect(sessionStorage.getItem("pkce_state")).toBeNull();
  });
});
