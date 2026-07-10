import { type ReactElement } from "react";
import { Link } from "react-router";
import { TrendingUp, Banknote, FolderOpen, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { useStorage } from "@/services/storage-context";
import { cn } from "@/lib/utils";
import { type DocStatus } from "@/domain/doc-completeness";
import { useRoutePrefix } from "@/hooks/use-route-prefix";
import { Skeleton } from "@/components/ui/skeleton";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const CARD_SURFACE = "rounded-xl border border-border bg-card shadow-sm";

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

interface MetricCardProps {
  icon: ReactElement;
  label: string;
  value: string;
  href: string;
}

function MetricCard({ icon, label, value, href }: MetricCardProps): ReactElement {
  return (
    <Link to={href} className={cn(CARD_SURFACE, "p-5 transition-colors hover:bg-accent/50")}>
      <div className="mb-2 flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold tracking-tight text-card-foreground">{value}</p>
    </Link>
  );
}

function DashboardSkeleton(): ReactElement {
  const metricLabels = [
    { icon: <TrendingUp className="size-3.5" />, label: "Cost Basis Added" },
    { icon: <Banknote className="size-3.5" />, label: "Total Spent" },
    { icon: <FolderOpen className="size-3.5" />, label: "Projects" },
    { icon: <CheckCircle2 className="size-3.5" />, label: "Docs Complete" },
  ] as const;

  return (
    <div className="space-y-8" data-testid="dashboard-skeleton">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {/* Metric cards — labels are static; values skeletonize */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {metricLabels.map(({ icon, label }) => (
          <div key={label} className={cn(CARD_SURFACE, "p-5")}>
            <div className="mb-2 flex items-center gap-1.5 text-muted-foreground">
              {icon}
              <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
            </div>
            <Skeleton className="h-8 w-28" />
          </div>
        ))}
      </div>

      {/* Documentation health — title is static; counts and bar skeletonize */}
      <div className={cn(CARD_SURFACE, "p-4")}>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">Documentation Health</span>
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>

      {/* Recent projects — heading is static; rows skeletonize */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Recent Projects</h2>
          <span className="text-sm font-medium text-muted-foreground">View all →</span>
        </div>
        <div className={cn(CARD_SURFACE, "divide-y divide-border")}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-2.5 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardPage(): ReactElement {
  const { manifest, loading, error, reload, getDocAssessment } = useStorage();
  const prefix = useRoutePrefix();

  if (!manifest && loading) {
    return <DashboardSkeleton />;
  }

  if (!manifest) {
    return (
      <div
        role="alert"
        data-testid="dashboard-error-banner"
        className="flex flex-col items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/10 p-8 text-center"
      >
        <AlertCircle className="size-8 text-destructive" />
        <div>
          <p className="font-semibold text-destructive">Couldn't load your data</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
        <button
          type="button"
          data-testid="dashboard-retry-button"
          onClick={() => { void reload(); }}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <RefreshCw className="size-4" />
          Try again
        </button>
      </div>
    );
  }

  const projects = manifest.projects;
  const assessments = projects.map((p) => getDocAssessment(p));
  const completeCount = assessments.filter((a) => a.status === "complete").length;
  const totalCost = projects.reduce((sum, p) => sum + p.totalCost, 0);
  const recentProjects = [...projects]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {/* Summary cards — 2×2 on mobile, 4-col at md+ */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <MetricCard
          icon={<TrendingUp className="size-3.5" />}
          label="Cost Basis Added"
          value={formatCurrency(manifest.summary.totalCostBasisAdded)}
          href={`${prefix}/projects`}
        />
        <MetricCard
          icon={<Banknote className="size-3.5" />}
          label="Total Spent"
          value={formatCurrency(totalCost)}
          href={`${prefix}/projects`}
        />
        <MetricCard
          icon={<FolderOpen className="size-3.5" />}
          label="Projects"
          value={String(projects.length)}
          href={`${prefix}/projects`}
        />
        <MetricCard
          icon={<CheckCircle2 className="size-3.5" />}
          label="Docs Complete"
          value={`${String(completeCount)} / ${String(projects.length)}`}
          href={`${prefix}/projects`}
        />
      </div>

      {/* Documentation health bar */}
      {projects.length > 0 && (
        <Link to={`${prefix}/projects`} className={cn(CARD_SURFACE, "block p-4 transition-colors hover:bg-accent/50")}>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Documentation Health</span>
            <span className="text-muted-foreground">
              {completeCount} of {projects.length} projects fully documented
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{
                width: `${String(Math.round((completeCount / projects.length) * 100))}%`,
              }}
            />
          </div>
        </Link>
      )}

      {/* Recent projects */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Recent Projects</h2>
          <Link
            to={`${prefix}/projects`}
            className="text-sm font-medium text-primary hover:underline"
          >
            View all →
          </Link>
        </div>
        {recentProjects.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">
            No projects yet. Add your first improvement to get started.
          </p>
        ) : (
          <div className={cn(CARD_SURFACE, "divide-y divide-border")}>
            {recentProjects.map((project) => {
              const assessment = getDocAssessment(project);
              return (
                <Link
                  key={project.id}
                  to={`${prefix}/projects/${project.id}`}
                  className="flex items-center justify-between p-4 transition-colors hover:bg-accent/50"
                >
                  <div className="flex items-center gap-3">
                    <StatusDot status={assessment.status} />
                    <div>
                      <p className="font-medium text-card-foreground">{project.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {project.completionDate} · {formatCurrency(project.totalCost)}
                      </p>
                    </div>
                  </div>
                  {assessment.missing.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <AlertCircle className="size-3" />
                      {assessment.missing.length} missing
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
