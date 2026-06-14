import { type ReactElement } from "react";
import { Link, Navigate } from "react-router";
import { trackDemoCTAClicked } from "@/services/analytics";
import { useAuth } from "@/services/auth-context";
import { PieChart, HardDrive, ServerOff, Key } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingPage(): ReactElement {
  const { isAuthenticated, signIn, status } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const isLoading = status === "authenticating";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="flex max-w-xl flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-4">
          <PieChart className="size-12 text-primary" strokeWidth={1.5} />
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Capital Improvements
          </h1>
          <p className="text-lg text-muted-foreground sm:text-xl">
            Track home improvements & their tax impact — privately, in your own Drive.
          </p>
        </div>

        <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button
            size="lg"
            onClick={signIn}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
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

        <div className="mt-8 flex flex-col gap-4 text-left text-sm text-muted-foreground">
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

        <div className="mt-12 text-sm text-muted-foreground/60 border-t pt-8">
          ⚠ Not tax advice. For recordkeeping only.
        </div>
      </div>
    </div>
  );
}
