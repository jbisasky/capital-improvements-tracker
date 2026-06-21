import { type ReactElement } from "react";
import { Link } from "react-router";
import { TrendingUp, Banknote, FolderOpen, AlertCircle, CheckCircle2 } from "lucide-react";
import { useStorage } from "@/services/storage-context";
import { cn } from "@/lib/utils";
import { type DocStatus } from "@/domain/doc-completeness";
import { useRoutePrefix } from "@/hooks/use-route-prefix";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

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
}

function MetricCard({ icon, label, value }: MetricCardProps): ReactElement {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
      <div className="mb-2 flex items-center gap-1.5 text-slate-400">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      </div>
      <p className="text-2xl font-bold tracking-tight text-slate-900">{value}</p>
    </div>
  );
}

export function DashboardPage(): ReactElement {
  const { manifest, loading, getDocAssessment } = useStorage();
  const prefix = useRoutePrefix();

  if (loading || !manifest) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">Loading...</p>
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
        />
        <MetricCard
          icon={<Banknote className="size-3.5" />}
          label="Total Spent"
          value={formatCurrency(totalCost)}
        />
        <MetricCard
          icon={<FolderOpen className="size-3.5" />}
          label="Projects"
          value={String(projects.length)}
        />
        <MetricCard
          icon={<CheckCircle2 className="size-3.5" />}
          label="Docs Complete"
          value={`${String(completeCount)} / ${String(projects.length)}`}
        />
      </div>

      {/* Documentation health bar */}
      {projects.length > 0 && (
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-900">Documentation Health</span>
            <span className="text-slate-500">
              {completeCount} of {projects.length} projects fully documented
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{
                width: `${String(Math.round((completeCount / projects.length) * 100))}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Recent projects */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Recent Projects</h2>
          <Link
            to={`${prefix}/projects`}
            className="text-sm font-medium text-primary hover:underline"
          >
            View all →
          </Link>
        </div>
        {recentProjects.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-slate-500">
            No projects yet. Add your first improvement to get started.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/5">
            {recentProjects.map((project) => {
              const assessment = getDocAssessment(project);
              return (
                <Link
                  key={project.id}
                  to={`${prefix}/projects/${project.id}`}
                  className="flex items-center justify-between p-4 transition-colors hover:bg-slate-50/70"
                >
                  <div className="flex items-center gap-3">
                    <StatusDot status={assessment.status} />
                    <div>
                      <p className="font-medium text-slate-900">{project.title}</p>
                      <p className="text-sm text-slate-500">
                        {project.completionDate} · {formatCurrency(project.totalCost)}
                      </p>
                    </div>
                  </div>
                  {assessment.missing.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-slate-400">
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
