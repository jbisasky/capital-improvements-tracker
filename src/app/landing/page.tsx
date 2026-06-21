import { type ReactElement } from "react";
import { Link, Navigate } from "react-router";
import { trackDemoCTAClicked } from "@/services/analytics";
import { useAuth } from "@/services/auth-context";
import {
  HardDrive,
  ServerOff,
  Key,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/ui/google-icon";
import { HomeChartLogo } from "@/components/brand/home-chart-logo";
import { LandingDashboardPreview } from "@/app/landing/landing-dashboard-preview";

const FEATURE_ITEMS = [
  {
    icon: HardDrive,
    lead: "Your data stays",
    rest: "in YOUR Google Drive",
  },
  {
    icon: ServerOff,
    lead: "No server",
    rest: "ever sees your files or keys",
  },
  {
    icon: Key,
    lead: "Bring your own",
    rest: "Gemini key for AI",
  },
] as const;

/**
 * Mobile: unified dark hero block — nav row + H1 + subhead all on #11262c.
 * Replaces the former sticky white header + separate pale canvas section.
 */
function MobileHeroBlock(): ReactElement {
  return (
    <section
      className="overflow-hidden rounded-b-[2rem] bg-[#11262c] px-6 pb-12 pt-8 text-white shadow-md sm:px-8"
      data-testid="landing-mobile-hero"
    >
      {/* Compact nav row */}
      <div className="mb-8 flex items-center gap-2.5">
        <div className="rounded-lg bg-white/10 p-1.5">
          <HomeChartLogo decorative markOnly className="size-4 text-white" />
        </div>
        <span className="text-sm font-bold tracking-tight text-white">
          Capital Improvements
        </span>
      </div>

      <div className="sm:max-w-xl">
        <h1 className="mb-3 text-3xl font-black tracking-tight text-white">
          Capital Improvements
        </h1>
        <p className="max-w-sm text-balance text-sm font-normal leading-relaxed text-slate-300/90">
          Track home improvements &amp; their tax impact — privately, in your own
          Google Drive.
        </p>
      </div>
    </section>
  );
}

function MobileDisclaimerFooter(): ReactElement {
  return (
    <footer className="mt-auto border-t border-zinc-200/50 bg-zinc-100/80 px-6 py-4 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-500">
      ⚠ Not tax advice — for recordkeeping only.
    </footer>
  );
}

interface LandingActionsProps {
  isLoading: boolean;
  onSignIn: () => void;
  status: string;
  layout: "mobile" | "desktop";
}

function FeatureList({ id }: { id?: string }): ReactElement {
  return (
    <ul
      id={id}
      className="flex flex-col gap-4 leading-relaxed text-zinc-600"
    >
      {FEATURE_ITEMS.map(({ icon: Icon, lead, rest }) => (
        <li key={lead} className="flex items-center gap-4">
          <div className="shrink-0 rounded-xl bg-teal-50/80 p-2.5 text-teal-950">
            <Icon className="size-4" />
          </div>
          <span className="text-base">
            <strong className="font-semibold text-zinc-900">{lead}</strong>{" "}
            <span className="font-normal text-zinc-500">{rest}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function LandingActions({
  isLoading,
  onSignIn,
  status,
  layout,
}: LandingActionsProps): ReactElement {
  if (layout === "mobile") {
    return (
      <div className="flex flex-col sm:flex-row sm:items-start sm:gap-8">
        {/* Left column: CTAs + session error */}
        <div className="flex w-full flex-col gap-3 sm:w-[45%]">
          <Button
            onClick={onSignIn}
            disabled={isLoading}
            className="h-auto w-full rounded-xl bg-[#11262c] px-4 py-3.5 text-sm font-semibold tracking-wide text-white shadow-sm hover:bg-[#0d1e23]"
          >
            <GoogleIcon className="mr-2" />
            {isLoading ? "Signing in…" : "Sign in with Google"}
          </Button>
          <Button
            variant="outline"
            render={<Link to="/demo" onClick={trackDemoCTAClicked} />}
            className="h-auto w-full rounded-xl border border-zinc-200 bg-transparent py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            See a demo
          </Button>
          {status === "needs_interaction" && (
            <p className="rounded-md border border-destructive/30 px-4 py-2 text-sm text-destructive">
              Session expired. Please sign in again.
            </p>
          )}
        </div>

        {/* Right column: feature list */}
        <div className="mt-6 w-full sm:mt-0 sm:w-[55%]">
          <FeatureList id="feature-list" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 md:gap-5">
        <Button
          size="lg"
          onClick={onSignIn}
          disabled={isLoading}
          className="w-full font-medium tracking-wide shadow-sm ring-1 ring-zinc-900/5 sm:w-auto md:h-auto md:px-6 md:py-4 md:text-base md:font-semibold md:tracking-wide"
        >
          <GoogleIcon className="mr-2" />
          {isLoading ? "Signing in…" : "Sign in with Google"}
        </Button>
        <Button
          variant="outline"
          size="lg"
          render={<Link to="/demo" onClick={trackDemoCTAClicked} />}
          className="w-full border-zinc-200 bg-white font-medium text-zinc-800 shadow-sm transition-all hover:border-zinc-300 hover:bg-zinc-50 sm:w-auto md:h-auto md:px-6 md:py-4 md:text-base md:font-semibold"
        >
          See a demo
        </Button>
      </div>

      {status === "needs_interaction" && (
        <p className="rounded-md border border-destructive/30 px-4 py-2 text-sm text-destructive">
          Session expired. Please sign in again.
        </p>
      )}

      <FeatureList />
    </div>
  );
}

export function LandingPage(): ReactElement {
  const { isAuthenticated, signIn, status } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const isLoading = status === "authenticating";

  return (
    <div
      className="min-h-screen bg-[#f4f6f7] md:bg-zinc-50/50"
      data-testid="landing-shell"
    >
      {/* Mobile — native full-screen layout (no mock phone frame) */}
      <div
        className="flex min-h-screen flex-col bg-[#f4f6f7] md:hidden"
        data-testid="landing-mobile-frame"
      >
        {/* Dark hero block: nav + headline + subhead */}
        <MobileHeroBlock />

        {/* Light body: floating interaction card + breathing room */}
        <div className="flex flex-1 flex-col">
          {/* Floating white card overlapping the hero section */}
          <section
            className="relative z-10 mx-5 -mt-6 rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] sm:mx-8"
            data-testid="landing-mobile-card"
          >
            <LandingActions
              isLoading={isLoading}
              onSignIn={signIn}
              status={status}
              layout="mobile"
            />
          </section>
          {/* Spacer so footer pins to frame bottom */}
          <div className="flex-1" />
        </div>

        <MobileDisclaimerFooter />
      </div>

      {/* Desktop — full-width layered layout */}
      <div className="hidden min-h-screen flex-col bg-zinc-50/50 md:flex">
        <header className="relative z-20 flex items-center gap-2 border-b border-zinc-100 bg-zinc-50/50 px-6 py-3">
          <HomeChartLogo decorative className="size-6 text-primary" />
          <span className="text-lg font-semibold tracking-tight text-zinc-900">
            Capital Improvements
          </span>
        </header>

        <main className="relative flex-1 overflow-hidden">
          {/* Layer 0 (z-0): dashboard watermark — full-bleed, ghost opacity */}
          <div className="absolute inset-0 z-0 flex items-center">
            <div className="h-full min-w-[1200px] opacity-20">
              <LandingDashboardPreview className="border border-zinc-200/80 shadow-lg" />
            </div>
          </div>

          {/* Layer 1 (z-10): gradient shield — solid canvas left, fades right */}
          <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-zinc-50 via-zinc-50/90 via-[40%] to-transparent" />

          {/* Layer 2 (z-20): hero copy + CTAs — left-aligned, always crisp */}
          <div className="pointer-events-none relative z-20 flex h-full items-center justify-start px-8 py-12 md:px-16">
            <div className="max-w-xl space-y-6">
              <div className="space-y-4">
                <h1 className="text-5xl font-black tracking-tighter text-zinc-900">
                  Capital Improvements
                </h1>
                <p className="max-w-md text-balance text-xl font-normal leading-relaxed text-zinc-600">
                  Track home improvements &amp; their tax impact — privately, in
                  your own Google Drive.
                </p>
              </div>
              <div className="pointer-events-auto">
                <LandingActions
                  isLoading={isLoading}
                  onSignIn={signIn}
                  status={status}
                  layout="desktop"
                />
              </div>
            </div>
          </div>
        </main>

        <footer className="relative z-20 border-t border-zinc-100 py-4 text-center text-sm text-zinc-500">
          ⚠ Not tax advice — for recordkeeping only.
        </footer>
      </div>
    </div>
  );
}
