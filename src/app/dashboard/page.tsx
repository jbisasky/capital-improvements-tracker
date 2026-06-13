import { type ReactElement } from "react";
import { Link } from "react-router";
import { DollarSign, FolderOpen, AlertCircle, CheckCircle2 } from "lucide-react";
import { useStorage } from "@/services/storage-context";
import { cn } from "@/lib/utils";
import { type DocStatus } from "@/domain/doc-completeness";

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

export function DashboardPage(): ReactElement {
  const { manifest, loading, getDocAssessment } = useStorage();

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

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="size-4" />
            Cost Basis Added
          </div>
          <p className="mt-2 text-2xl font-bold">
            {formatCurrency(manifest.summary.totalCostBasisAdded)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="size-4" />
            Total Spent
          </div>
          <p className="mt-2 text-2xl font-bold">{formatCurrency(totalCost)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FolderOpen className="size-4" />
            Projects
          </div>
          <p className="mt-2 text-2xl font-bold">{projects.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4" />
            Docs Complete
          </div>
          <p className="mt-2 text-2xl font-bold">
            {completeCount} / {projects.length}
          </p>
        </div>
      </div>

      {/* Documentation health bar */}
      {projects.length > 0 && (
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">Documentation Health</span>
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
        </div>
      )}

      {/* Recent projects */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Recent Projects</h2>
          <Link
            to="/projects"
            className="text-sm text-primary hover:underline"
          >
            View all →
          </Link>
        </div>
        {recentProjects.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
            No projects yet. Add your first improvement to get started.
          </p>
        ) : (
          <div className="divide-y rounded-lg border">
            {recentProjects.map((project) => {
              const assessment = getDocAssessment(project);
              return (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <StatusDot status={assessment.status} />
                    <div>
                      <p className="font-medium">{project.title}</p>
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
