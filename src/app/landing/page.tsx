import { type ReactElement } from "react";
import { Link, Navigate } from "react-router";
import { trackDemoCTAClicked } from "@/services/analytics";
import { useAuth } from "@/services/auth-context";

export function LandingPage(): ReactElement {
  const { isAuthenticated, signIn, status } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const isLoading = status === "authenticating";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Capital Improvements Tracker
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Track home improvements, scan receipts with AI, and stay IRS-ready.
        </p>
      </div>
      <div className="flex gap-4">
        <button
          type="button"
          onClick={signIn}
          disabled={isLoading}
          className="inline-flex h-10 items-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50"
        >
          {isLoading ? "Signing in…" : "Sign in with Google"}
        </button>
        <Link
          to="/demo"
          onClick={trackDemoCTAClicked}
          className="inline-flex h-10 items-center rounded-lg border border-border px-6 text-sm font-medium hover:bg-muted"
        >
          Try Demo
        </Link>
      </div>
      {status === "needs_interaction" && (
        <p className="text-sm text-destructive">
          Session expired. Please sign in again.
        </p>
      )}
    </div>
  );
}
