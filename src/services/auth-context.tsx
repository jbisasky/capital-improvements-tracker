import {
  createContext,
  useContext,
  useState,
  useEffect,
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

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): ReactElement {
  const [authState, setAuthState] = useState<AuthState>(getAuthState);

  useEffect(() => {
    if (CLIENT_ID !== "") {
      initAuth(CLIENT_ID);
    }

    // Subscribe first so React sees every state transition from the callback.
    const listener = (state: AuthState): void => {
      setAuthState({ ...state });
    };
    subscribe(listener);

    // Handle OAuth redirect callback (PKCE code exchange) after subscribing
    // so the authenticating → authenticated transition is captured.
    void handleRedirectCallback();
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
  const [prev, setPrev] = useState<T | undefined>(undefined);
  const [current, setCurrent] = useState<T>(value);

  if (value !== current) {
    setPrev(current);
    setCurrent(value);
  }

  return prev;
}
