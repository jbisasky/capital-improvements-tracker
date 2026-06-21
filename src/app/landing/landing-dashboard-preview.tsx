import { type ReactElement } from "react";
import {
  LayoutDashboard,
  FolderOpen,
  Settings,
  Download,
  Info,
  DollarSign,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HomeChartLogo } from "@/components/brand/home-chart-logo";
import { type DocStatus } from "@/domain/doc-completeness";
import {
  formatLandingPreviewCurrency,
  LANDING_PREVIEW_DATA,
  type LandingPreviewProject,
} from "@/app/landing/landing-preview-data";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Projects", icon: FolderOpen, active: false },
  { label: "Export", icon: Download, active: false },
  { label: "Settings", icon: Settings, active: false },
  { label: "About", icon: Info, active: false },
] as const;

function StatusDot({ status }: { status: DocStatus }): ReactElement {
  return (
    <span
      className={cn(
        "inline-block size-2.5 rounded-full",
        status === "complete" && "bg-green-500",
        status === "partial" && "bg-yellow-500",
        status === "incomplete" && "bg-red-500",
      )}
    />
  );
}

function PreviewProjectRow({ project }: { project: LandingPreviewProject }): ReactElement {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <StatusDot status={project.status} />
        <div>
          <p className="font-medium">{project.title}</p>
          <p className="text-sm text-muted-foreground">
            {project.completionDate}
            {" · "}
            {formatLandingPreviewCurrency(project.totalCost)}
          </p>
        </div>
      </div>
      {project.missingCount > 0 && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <AlertCircle className="size-3" />
          {String(project.missingCount)}
          {" missing"}
        </span>
      )}
    </div>
  );
}

/** Static app shell + dashboard mock for the desktop landing backdrop. */
export function LandingDashboardPreview({
  className,
}: {
  className?: string;
}): ReactElement {
  const {
    costBasisAdded,
    totalSpent,
    projectCount,
    docsCompleteCount,
    recentProjects,
  } = LANDING_PREVIEW_DATA;

  const healthPercent = Math.round((docsCompleteCount / projectCount) * 100);

  return (
    <div
      className={cn(
        "flex h-full min-h-[32rem] w-full overflow-hidden rounded-xl border bg-background shadow-lg ring-1 ring-foreground/10",
        className,
      )}
      data-testid="landing-dashboard-preview"
    >
      <aside className="w-60 shrink-0 border-r bg-sidebar">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <HomeChartLogo decorative className="size-5 text-primary" />
          <span className="text-sm font-semibold">Capital Tracker</span>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {NAV_ITEMS.map(({ label, icon: Icon, active }) => (
            <div
              key={label}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </div>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1 p-6">
        <div className="space-y-8">
          <h1 className="text-2xl font-semibold">Dashboard</h1>

          <div className="grid grid-cols-4 gap-4">
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="size-4" />
                Cost Basis Added
              </div>
              <p className="mt-2 text-2xl font-bold">
                {formatLandingPreviewCurrency(costBasisAdded)}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="size-4" />
                Total Spent
              </div>
              <p className="mt-2 text-2xl font-bold">
                {formatLandingPreviewCurrency(totalSpent)}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FolderOpen className="size-4" />
                Projects
              </div>
              <p className="mt-2 text-2xl font-bold">{projectCount}</p>
            </div>
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4" />
                Docs Complete
              </div>
              <p className="mt-2 text-2xl font-bold">
                {docsCompleteCount}
                {" / "}
                {projectCount}
              </p>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">Documentation Health</span>
              <span className="text-muted-foreground">
                {docsCompleteCount}
                {" of "}
                {projectCount}
                {" projects fully documented"}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-green-500"
                style={{ width: `${String(healthPercent)}%` }}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Recent Projects</h2>
              <span className="text-sm text-primary">View all →</span>
            </div>
            <div className="divide-y rounded-lg border">
              {recentProjects.map((project) => (
                <PreviewProjectRow key={project.title} project={project} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
