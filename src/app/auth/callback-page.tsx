import { useEffect, type ReactElement } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/services/auth-context";

/**
 * Landing point for the Google OAuth2 PKCE redirect.
 * AuthProvider handles the code exchange on mount; we just wait for the
 * auth state to resolve then navigate to the dashboard (or back to "/" on
 * failure so the user sees the error message on the landing page).
 */
export function AuthCallbackPage(): ReactElement {
  const { status } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "authenticated") {
      void navigate("/dashboard", { replace: true });
    } else if (status === "unauthenticated" || status === "needs_interaction") {
      void navigate("/", { replace: true });
    }
    // While "authenticating" we stay on this page and show the spinner.
  }, [status, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Completing sign-in…</p>
      </div>
    </div>
  );
}
