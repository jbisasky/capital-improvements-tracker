import { useEffect, useRef, type ReactElement } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/services/auth-context";
import { failWithTimeout } from "@/services/auth";

/**
 * Landing point for the Google OAuth2 PKCE redirect.
 * AuthProvider handles the code exchange on mount. We wait for the status
 * to leave "authenticating" before deciding where to navigate — this
 * prevents an immediate redirect caused by the initial "unauthenticated"
 * state before the token exchange resolves.
 */
export function AuthCallbackPage(): ReactElement {
  const { status } = useAuth();
  const navigate = useNavigate();

  // Track whether we've seen at least one "authenticating" status, meaning
  // handleRedirectCallback has started its async work. A ref avoids the
  // setState-in-effect pattern while still persisting the flag across renders.
  const exchangeStartedRef = useRef(false);

  useEffect(() => {
    if (status === "authenticating") {
      exchangeStartedRef.current = true;
    } else if (status === "authenticated") {
      void navigate("/dashboard", { replace: true });
    } else if (exchangeStartedRef.current) {
      // Exchange finished but failed — go back to landing so the error
      // message on the landing page is shown.
      void navigate("/", { replace: true });
    }
  }, [status, navigate]);

  // Bail out after 15 s — handles a hung or very slow token exchange.
  useEffect(() => {
    const id = setTimeout(() => {
      failWithTimeout();
    }, 15_000);
    return () => { clearTimeout(id); };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Completing sign-in…</p>
      </div>
    </div>
  );
}
