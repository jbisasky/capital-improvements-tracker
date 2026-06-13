import { type ReactElement } from "react";
import { Link } from "react-router";
import { trackDemoCTAClicked } from "@/services/analytics";

export function LandingPage(): ReactElement {
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
        <Link
          to="/dashboard"
          className="inline-flex h-10 items-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/80"
        >
          Sign in with Google
        </Link>
        <Link
          to="/demo"
          onClick={trackDemoCTAClicked}
          className="inline-flex h-10 items-center rounded-lg border border-border px-6 text-sm font-medium hover:bg-muted"
        >
          Try Demo
        </Link>
      </div>
    </div>
  );
}
