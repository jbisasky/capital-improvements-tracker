import { type ReactElement, useState, useMemo } from "react";
import { Link } from "react-router";
import { Plus, Search, AlertCircle } from "lucide-react";
import { useStorage } from "@/services/storage-context";
import { cn } from "@/lib/utils";
import { type DocStatus } from "@/domain/doc-completeness";
import { type TaxTreatment } from "@/domain/schemas";
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
        "inline-block size-2.5 rounded-full shrink-0",
        status === "complete" && "bg-green-500",
        status === "partial" && "bg-yellow-500",
        status === "incomplete" && "bg-red-500",
      )}
    />
  );
}

const TREATMENT_LABELS: Record<TaxTreatment, string> = {
  capital_improvement: "Capital Improvement",
  repair: "Repair",
  deductible: "Deductible",
  credit: "Tax Credit",
  unknown: "Unclassified",
};

type FilterStatus = "all" | DocStatus;

export function ProjectsListPage(): ReactElement {
  const { manifest, getDocAssessment } = useStorage();
  const prefix = useRoutePrefix();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  const projects = useMemo(() => manifest?.projects ?? [], [manifest?.projects]);

  const filtered = useMemo(() => {
    let result = projects;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.vendorName?.toLowerCase().includes(q) ?? false),
      );
    }
    if (filterStatus !== "all") {
      result = result.filter((p) => {
        const assessment = getDocAssessment(p);
        return assessment.status === filterStatus;
      });
    }
    return result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [projects, search, filterStatus, getDocAssessment]);

  if (!manifest) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <Link
          to={`${prefix}/projects/new`}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <Plus className="size-4" />
          Add Project
        </Link>
      </div>

      {/* Search and filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title or vendor..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); }}
            className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value as FilterStatus); }}
          className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All statuses</option>
          <option value="complete">Complete</option>
          <option value="partial">Partial</option>
          <option value="incomplete">Incomplete</option>
        </select>
      </div>

      {/* Project list */}
      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          {projects.length === 0
            ? "No projects yet. Add your first improvement to get started."
            : "No projects match your filters."}
        </p>
      ) : (
        <div className="divide-y rounded-lg border">
          {filtered.map((project) => {
            const assessment = getDocAssessment(project);
            return (
              <Link
                key={project.id}
                to={`${prefix}/projects/${project.id}`}
                className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <StatusDot status={assessment.status} />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{project.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {project.completionDate} ·{" "}
                      {TREATMENT_LABELS[project.taxTreatment]}
                      {project.vendorName ? ` · ${project.vendorName}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {assessment.missing.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <AlertCircle className="size-3" />
                      {assessment.missing.length}
                    </span>
                  )}
                  <span className="text-sm font-medium">
                    {formatCurrency(project.totalCost)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
