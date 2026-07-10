import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  type AuthState,
  initAuth,
  signIn as authSignIn,
  signOut as authSignOut,
  getAuthState,
  handleRedirectCallback,
  subscribe,
  unsubscribe,
} from "@/services/auth";
import { trackSignIn } from "@/services/analytics";

interface AuthContextValue {
  status: AuthState["status"];
  error: string | null;
  isAuthenticated: boolean;
  signIn: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const CLIENT_ID = (import.meta.env["VITE_GOOGLE_CLIENT_ID"] as string | undefined) ?? "";

// Initialize auth at module load time so getAuthState() returns the restored
// token state before the first React render. Token restoration must work even
// when OAuth sign-in is not configured (for E2E and demo-like local runs).
initAuth(CLIENT_ID);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): ReactElement {
  const [authState, setAuthState] = useState<AuthState>(getAuthState);

  useEffect(() => {
    // Subscribe first so React sees every state transition from the callback.
    const listener = (state: AuthState): void => {
      setAuthState({ ...state });
    };
    subscribe(listener);

    // Handle OAuth redirect callback (PKCE code exchange) after subscribing
    // so the authenticating → authenticated transition is captured.
    // handleRedirectCallback has an internal try/catch; this .catch() is purely
    // defensive against unexpected programming errors that escape it.
    void handleRedirectCallback().catch(() => undefined);
    return () => {
      unsubscribe(listener);
    };
  }, []);

  const handleSignIn = useCallback(() => {
    authSignIn();
  }, []);

  const handleSignOut = useCallback(() => {
    authSignOut();
  }, []);

  const prevStatusRef = usePrevious(authState.status);
  useEffect(() => {
    if (
      prevStatusRef === "authenticating" &&
      authState.status === "authenticated"
    ) {
      trackSignIn();
    }
  }, [authState.status, prevStatusRef]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: authState.status,
      error: authState.error,
      isAuthenticated: authState.status === "authenticated",
      signIn: handleSignIn,
      signOut: handleSignOut,
    }),
    [authState.status, authState.error, handleSignIn, handleSignOut],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context == null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

function usePrevious<T>(value: T): T | undefined {
  const prevRef = useRef<T | undefined>(undefined);
  const currentRef = useRef<T>(value);
  // eslint-disable-next-line react-hooks/refs
  const prev = prevRef.current;

  useEffect(() => {
    prevRef.current = currentRef.current;
    currentRef.current = value;
  });

  return prev;
}
