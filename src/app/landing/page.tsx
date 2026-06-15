import { type ReactElement } from "react";
import { Link, Navigate } from "react-router";
import { trackDemoCTAClicked } from "@/services/analytics";
import { useAuth } from "@/services/auth-context";
import {
  PieChart,
  HardDrive,
  FileText,
  ShieldCheck,
  ServerOff,
  Key,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
      <header className="flex items-center gap-2 border-b px-6 py-3">
        <PieChart className="size-6 text-primary" strokeWidth={1.5} />
        <span className="text-lg font-semibold tracking-tight">
          Capital Improvements
        </span>
      </header>

      {/* Main content */}
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="mx-auto grid w-full max-w-5xl items-center gap-12 lg:grid-cols-2">
          {/* Left column — hero */}
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Capital Improvements
              </h1>
              <p className="text-lg text-muted-foreground sm:text-xl">
                Track home improvements &amp; their tax impact — privately, in
                your own Google Drive.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Button
                size="lg"
                onClick={signIn}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                <GoogleIcon className="mr-2" />
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
              <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
                Session expired. Please sign in again.
              </p>
            )}

            <ul className="flex flex-col gap-4 text-sm text-muted-foreground">
              <li className="flex items-center gap-3">
                <HardDrive className="size-5 shrink-0" />
                <span>Your data stays in YOUR Google Drive</span>
              </li>
              <li className="flex items-center gap-3">
                <ServerOff className="size-5 shrink-0" />
                <span>No server ever sees your files or keys</span>
              </li>
              <li className="flex items-center gap-3">
                <Key className="size-5 shrink-0" />
                <span>Bring your own Gemini key for AI</span>
              </li>
            </ul>
          </div>

          {/* Right column — decorative illustration (hidden on mobile) */}
          <div className="hidden lg:block" aria-hidden="true">
            <Card className="mx-auto flex max-w-sm items-center justify-center p-10">
              <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col items-center gap-2">
                  <div className="rounded-lg bg-primary/10 p-4">
                    <PieChart className="size-10 text-primary" strokeWidth={1.5} />
                  </div>
                  <span className="text-xs text-muted-foreground">Analytics</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="rounded-lg bg-accent p-4">
                    <HardDrive className="size-10 text-accent-foreground" strokeWidth={1.5} />
                  </div>
                  <span className="text-xs text-muted-foreground">Storage</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="rounded-lg bg-muted p-4">
                    <FileText className="size-10 text-muted-foreground" strokeWidth={1.5} />
                  </div>
                  <span className="text-xs text-muted-foreground">Documents</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="rounded-lg bg-primary/10 p-4">
                    <ShieldCheck className="size-10 text-primary" strokeWidth={1.5} />
                  </div>
                  <span className="text-xs text-muted-foreground">Security</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-4 text-center text-sm text-muted-foreground/60">
        ⚠ Not tax advice — for recordkeeping only.
      </footer>
    </div>
  );
}
