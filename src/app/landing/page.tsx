import { type ReactElement } from "react";
import { Link, Navigate } from "react-router";
import { trackDemoCTAClicked } from "@/services/analytics";
import { useAuth } from "@/services/auth-context";
import { PieChart, HardDrive, FileText, ShieldCheck, ServerOff, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/ui/google-icon";

export function LandingPage(): ReactElement {
  const { isAuthenticated, signIn, status } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const isLoading = status === "authenticating";

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center gap-2 px-6 py-4">
        <PieChart className="size-6 text-primary" strokeWidth={1.5} />
        <span className="text-lg font-semibold tracking-tight">Capital Improvements</span>
      </header>

      {/* Main */}
      <main className="flex flex-1 items-center px-6 py-12">
        <div className="mx-auto w-full max-w-6xl lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
          {/* Left column — hero content */}
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Capital Improvements
              </h1>
              <p className="text-lg text-muted-foreground sm:text-xl">
                Track home improvements &amp; their tax impact — privately, in your own Drive.
              </p>
            </div>

            <div className="flex w-full flex-col gap-4 sm:flex-row">
              <Button
                size="lg"
                onClick={signIn}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                <GoogleIcon className="size-5 shrink-0" />
                {isLoading ? "Signing in…" : "Sign in with Google"}
              </Button>
              <Button
                variant="outline"
                size="lg"
                render={<Link to="/demo" onClick={trackDemoCTAClicked} />}
                className="w-full sm:w-auto"
              >
                See a demo
              </Button>
            </div>

            {status === "needs_interaction" && (
              <p className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-md">
                Session expired. Please sign in again.
              </p>
            )}

            <div className="flex flex-col gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-3">
                <HardDrive className="size-5 shrink-0" />
                <p>Your data stays in YOUR Google Drive</p>
              </div>
              <div className="flex items-center gap-3">
                <ServerOff className="size-5 shrink-0" />
                <p>No server ever sees your files or keys</p>
              </div>
              <div className="flex items-center gap-3">
                <Key className="size-5 shrink-0" />
                <p>Bring your own Gemini key for AI</p>
              </div>
            </div>
          </div>

          {/* Right column — decorative illustration */}
          <div className="hidden lg:flex lg:items-center lg:justify-center" aria-hidden="true">
            <div className="rounded-xl border bg-card p-8 shadow-sm">
              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col items-center gap-2 rounded-lg bg-muted/50 p-6">
                  <PieChart className="size-10 text-primary" strokeWidth={1.5} />
                  <span className="text-xs font-medium text-muted-foreground">Analytics</span>
                </div>
                <div className="flex flex-col items-center gap-2 rounded-lg bg-muted/50 p-6">
                  <HardDrive className="size-10 text-primary" strokeWidth={1.5} />
                  <span className="text-xs font-medium text-muted-foreground">Drive Storage</span>
                </div>
                <div className="flex flex-col items-center gap-2 rounded-lg bg-muted/50 p-6">
                  <FileText className="size-10 text-primary" strokeWidth={1.5} />
                  <span className="text-xs font-medium text-muted-foreground">Documents</span>
                </div>
                <div className="flex flex-col items-center gap-2 rounded-lg bg-muted/50 p-6">
                  <ShieldCheck className="size-10 text-primary" strokeWidth={1.5} />
                  <span className="text-xs font-medium text-muted-foreground">IRS Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t px-6 py-4 text-center text-sm text-muted-foreground/60">
        ⚠ Not tax advice. For recordkeeping only.
      </footer>
    </div>
  );
}
