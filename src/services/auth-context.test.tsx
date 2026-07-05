import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { type ReactNode } from "react";
import { AuthProvider, useAuth } from "@/services/auth-context";
import * as auth from "@/services/auth";
import * as analytics from "@/services/analytics";

vi.mock("@/services/auth", () => ({
  initAuth: vi.fn(),
  getAuthState: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handleRedirectCallback: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock("@/services/analytics", () => ({
  trackSignIn: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wrapper({ children }: { children: ReactNode }): ReactNode {
  return <AuthProvider>{children}</AuthProvider>;
}

const unauthenticatedState: auth.AuthState = {
  status: "unauthenticated",
  accessToken: null,
  expiresAt: null,
  error: null,
};

const authenticatingState: auth.AuthState = {
  status: "authenticating",
  accessToken: null,
  expiresAt: null,
  error: null,
};

const authenticatedState: auth.AuthState = {
  status: "authenticated",
  accessToken: "tok_abc",
  expiresAt: Date.now() + 3_600_000,
  error: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  (auth.getAuthState as Mock).mockReturnValue(unauthenticatedState);
  (auth.handleRedirectCallback as Mock).mockResolvedValue(false);
  (auth.subscribe as Mock).mockImplementation(() => undefined);
  (auth.unsubscribe as Mock).mockImplementation(() => undefined);
});

// ---------------------------------------------------------------------------
// useAuth outside AuthProvider
// ---------------------------------------------------------------------------

describe("useAuth", () => {
  it("throws when used outside AuthProvider", () => {
    // Arrange + Act + Assert
    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth must be used within an AuthProvider",
    );
  });
});

// ---------------------------------------------------------------------------
// AuthProvider — basic contract
// ---------------------------------------------------------------------------

describe("AuthProvider — context value", () => {
  it("exposes status, isAuthenticated=false, and error=null for unauthenticated state", () => {
    // Arrange
    (auth.getAuthState as Mock).mockReturnValue(unauthenticatedState);

    // Act
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Assert
    expect(result.current.status).toBe("unauthenticated");
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("exposes isAuthenticated=true when state is authenticated", () => {
    // Arrange
    (auth.getAuthState as Mock).mockReturnValue(authenticatedState);

    // Act
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Assert
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.status).toBe("authenticated");
  });
});

// ---------------------------------------------------------------------------
// AuthProvider — lifecycle
// ---------------------------------------------------------------------------

describe("AuthProvider — lifecycle", () => {
  it("calls subscribe on mount", () => {
    // Arrange + Act
    renderHook(() => useAuth(), { wrapper });

    // Assert
    expect(auth.subscribe).toHaveBeenCalledOnce();
  });

  it("calls unsubscribe on unmount", () => {
    // Arrange
    const { unmount } = renderHook(() => useAuth(), { wrapper });

    // Act
    unmount();

    // Assert
    expect(auth.unsubscribe).toHaveBeenCalledOnce();
    const subscribeArg = (auth.subscribe as Mock).mock.calls[0]![0] as auth.AuthListener;
    const unsubscribeArg = (auth.unsubscribe as Mock).mock.calls[0]![0] as auth.AuthListener;
    expect(subscribeArg).toBe(unsubscribeArg);
  });

  it("calls handleRedirectCallback on mount", () => {
    // Arrange + Act
    renderHook(() => useAuth(), { wrapper });

    // Assert
    expect(auth.handleRedirectCallback).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// AuthProvider — analytics
// ---------------------------------------------------------------------------

describe("AuthProvider — analytics", () => {
  it("fires trackSignIn on authenticating → authenticated transition", async () => {
    // Arrange: capture the subscribe listener so we can drive state
    let capturedListener: auth.AuthListener | null = null;
    (auth.subscribe as Mock).mockImplementation((l: auth.AuthListener) => {
      capturedListener = l;
    });
    (auth.getAuthState as Mock).mockReturnValue(authenticatingState);

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.status).toBe("authenticating");

    // Act: drive the transition to authenticated
    await act(async () => {
      capturedListener!(authenticatedState);
    });

    // Assert
    expect(analytics.trackSignIn).toHaveBeenCalledOnce();
  });

  it("does NOT fire trackSignIn on page refresh (status starts at authenticated)", async () => {
    // Arrange: simulate a page refresh — getAuthState already returns authenticated
    (auth.getAuthState as Mock).mockReturnValue(authenticatedState);

    // Act
    renderHook(() => useAuth(), { wrapper });

    // Wait a tick so any effects settle
    await act(async () => {
      await Promise.resolve();
    });

    // Assert
    expect(analytics.trackSignIn).not.toHaveBeenCalled();
  });

  it("does NOT fire trackSignIn on unrelated status transitions", async () => {
    // Arrange
    let capturedListener: auth.AuthListener | null = null;
    (auth.subscribe as Mock).mockImplementation((l: auth.AuthListener) => {
      capturedListener = l;
    });
    (auth.getAuthState as Mock).mockReturnValue(unauthenticatedState);

    renderHook(() => useAuth(), { wrapper });

    // Act: transition unauthenticated → authenticating (not the trigger transition)
    await act(async () => {
      capturedListener!(authenticatingState);
    });

    // Assert
    expect(analytics.trackSignIn).not.toHaveBeenCalled();
  });
});
