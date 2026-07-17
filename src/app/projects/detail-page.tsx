import { type ReactElement } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { ArrowLeft, Pencil, Trash2, AlertCircle } from "lucide-react";
import { useStorage } from "@/services/storage-context";
import { cn } from "@/lib/utils";
import { type TaxTreatment } from "@/domain/schemas";
import { useRoutePrefix } from "@/hooks/use-route-prefix";
import {
  formatDocFieldLabel,
  RECEIPT_DETAIL_LABELS,
} from "@/domain/receipt-detail-level";
import { AttachmentSection } from "@/app/projects/attachment-section";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button-variants";
import { Button } from "@/components/ui/button";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const TREATMENT_LABELS: Record<TaxTreatment, string> = {
  capital_improvement: "Capital Improvement",
  repair: "Repair",
  deductible: "Deductible",
  credit: "Tax Credit",
  unknown: "Unclassified",
};

const FINANCIAL_LABELS = ["Total Cost", "Cost Basis", "Deductible"] as const;
const DETAIL_LABELS = ["Category", "Vendor", "Payment Method", "Receipt detail"] as const;

function ProjectDetailSkeleton({ prefix }: { prefix: string }): ReactElement {
  return (
    <div className="space-y-4 md:space-y-6" data-testid="project-detail-skeleton">
      <Link
        to={`${prefix}/projects`}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="size-4" /> Back to projects
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-48 max-w-full" />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm opacity-50"
          >
            <Pencil className="size-3.5" /> Edit
          </button>
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 opacity-50"
          >
            <Trash2 className="size-3.5" /> Delete
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        <div className="space-y-4 md:space-y-6 lg:col-span-2">
          <div className="grid gap-2 sm:grid-cols-3 sm:gap-4">
            {FINANCIAL_LABELS.map((label) => (
              <div key={label} className="flex items-center justify-between rounded-lg border p-3 sm:block sm:p-4">
                <p className="text-sm text-muted-foreground">{label}</p>
                <Skeleton className="h-6 w-24 sm:mt-1 sm:h-7" />
              </div>
            ))}
          </div>

          <section className="rounded-lg border p-3 md:p-4">
            <h2 className="mb-2 text-sm font-medium">IRS Justification</h2>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </section>

          <section className="rounded-lg border p-3 md:p-4">
            <h2 className="mb-3 text-sm font-medium">Details</h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              {DETAIL_LABELS.map((label) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-1">
                    <Skeleton className="h-4 w-32" />
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="space-y-3">
            <h2 className="text-sm font-medium">Attachments</h2>
            <div className="divide-y rounded-lg border">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-3 p-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-8 rounded-md" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside aria-label="Documentation status" className="space-y-4">
          <section className="rounded-lg border p-3 md:p-4">
            <h2 className="mb-3 text-sm font-medium">Documentation Health</h2>
            <div className="mb-3 flex items-center gap-3">
              <Skeleton className="size-12 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-3 w-32" />
            </div>
          </section>

          <section className="rounded-lg border p-3 md:p-4">
            <h2 className="mb-2 text-sm font-medium">AI Confidence</h2>
            <Skeleton className="h-8 w-16" />
          </section>
        </aside>
      </div>
    </div>
  );
}

export function ProjectDetailPage(): ReactElement {
  const { id } = useParams();
  const navigate = useNavigate();
  const prefix = useRoutePrefix();
  const { manifest, deleteProject, getDocAssessment } = useStorage();

  const isDataPending = manifest == null;

  if (isDataPending) {
    return <ProjectDetailSkeleton prefix={prefix} />;
  }

  const project = manifest.projects.find((p) => p.id === id);
  if (!project) {
    return (
      <div className="space-y-4">
        <Link to={`${prefix}/projects`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="size-4" /> Back to projects
        </Link>
        <p className="text-muted-foreground">Project not found.</p>
      </div>
    );
  }

  const assessment = getDocAssessment(project);

  async function handleDelete(): Promise<void> {
    if (!id) return;
    const result = await deleteProject(id);
    if (result.ok) {
      void navigate(`${prefix}/projects`);
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <Link to={`${prefix}/projects`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft className="size-4" /> Back to projects
      </Link>

      <div>
        <h1 className="text-2xl font-semibold">{project.title}</h1>
        <time dateTime={project.completionDate} className="mt-1 block text-sm text-muted-foreground">{project.completionDate}</time>
        <p className="text-sm text-muted-foreground">{TREATMENT_LABELS[project.taxTreatment]}</p>
        <div className="mt-3 flex gap-2">
          <Link
            to={`${prefix}/projects/${project.id}/edit`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
          >
            <Pencil className="size-3.5" /> Edit
          </Link>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => { void handleDelete(); }}
            className="gap-1.5"
          >
            <Trash2 className="size-3.5" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-4 md:space-y-6 lg:col-span-2">
          {/* Financial summary */}
          <div className="grid gap-2 sm:grid-cols-3 sm:gap-4">
            <div className="flex items-center justify-between rounded-lg border p-3 sm:block sm:p-4">
              <p className="text-sm text-muted-foreground">Total Cost</p>
              <p className="text-base font-semibold sm:mt-1 sm:text-lg">{formatCurrency(project.totalCost)}</p>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 sm:block sm:p-4">
              <p className="text-sm text-muted-foreground">Cost Basis</p>
              <p className="text-base font-semibold sm:mt-1 sm:text-lg">{formatCurrency(project.costBasisAdjustment)}</p>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 sm:block sm:p-4">
              <p className="text-sm text-muted-foreground">Deductible</p>
              <p className="text-base font-semibold sm:mt-1 sm:text-lg">{formatCurrency(project.deductibleAmount)}</p>
            </div>
          </div>

          {/* IRS Justification */}
          {project.irsJustification && (
            <section className="rounded-lg border p-3 md:p-4">
              <h2 className="mb-2 text-sm font-medium">IRS Justification</h2>
              <p className="text-sm text-muted-foreground">{project.irsJustification}</p>
            </section>
          )}

          {/* Details grid */}
          <section className="rounded-lg border p-3 md:p-4">
            <h2 className="mb-3 text-sm font-medium">Details</h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              {project.category && (
                <div>
                  <dt className="text-xs text-muted-foreground">Category</dt>
                  <dd className="text-sm capitalize">{project.category.replace("_", " ")}</dd>
                </div>
              )}
              {project.vendorName && (
                <div>
                  <dt className="text-xs text-muted-foreground">Vendor</dt>
                  <dd className="text-sm">{project.vendorName}</dd>
                </div>
              )}
              {project.vendorTin && (
                <div>
                  <dt className="text-xs text-muted-foreground">Vendor TIN</dt>
                  <dd className="text-sm font-mono">{project.vendorTin}</dd>
                </div>
              )}
              {project.paymentMethod && (
                <div>
                  <dt className="text-xs text-muted-foreground">Payment Method</dt>
                  <dd className="text-sm capitalize">{project.paymentMethod.replace("_", " ")}</dd>
                </div>
              )}
              {project.datePaymentMade && (
                <div>
                  <dt className="text-xs text-muted-foreground">Payment Date</dt>
                  <dd className="text-sm"><time dateTime={project.datePaymentMade}>{project.datePaymentMade}</time></dd>
                </div>
              )}
              {project.permitNumber && (
                <div>
                  <dt className="text-xs text-muted-foreground">Permit #</dt>
                  <dd className="text-sm font-mono">{project.permitNumber}</dd>
                </div>
              )}
              {project.receiptDetailLevel && (
                <div>
                  <dt className="text-xs text-muted-foreground">Receipt detail</dt>
                  <dd className="text-sm">{RECEIPT_DETAIL_LABELS[project.receiptDetailLevel]}</dd>
                </div>
              )}
              {project.energyCreditType && project.energyCreditType !== "none" && (
                <div>
                  <dt className="text-xs text-muted-foreground">Energy Credit</dt>
                  <dd className="text-sm uppercase">{project.energyCreditType}</dd>
                </div>
              )}
              {project.usefulLifeYears != null && (
                <div>
                  <dt className="text-xs text-muted-foreground">Useful Life</dt>
                  <dd className="text-sm">{project.usefulLifeYears} years</dd>
                </div>
              )}
              {project.sqftAffected != null && (
                <div>
                  <dt className="text-xs text-muted-foreground">Sq Ft Affected</dt>
                  <dd className="text-sm">{project.sqftAffected}</dd>
                </div>
              )}
            </dl>
          </section>

          {/* Notes */}
          {project.notes && (
            <section className="rounded-lg border p-3 md:p-4">
              <h2 className="mb-2 text-sm font-medium">Notes</h2>
              <p className="text-sm text-muted-foreground">{project.notes}</p>
            </section>
          )}

          {/* Attachments */}
          <AttachmentSection
            projectId={project.id}
            attachments={project.attachments}
            mode="live"
          />
        </div>

        {/* Sidebar — Documentation Health */}
        <aside aria-label="Documentation status" className="space-y-4">
          <section className="rounded-lg border p-3 md:p-4">
            <h2 className="mb-3 text-sm font-medium">Documentation Health</h2>
            <div className="mb-3 flex items-center gap-3">
              <div
                className={cn(
                  "flex size-12 items-center justify-center rounded-full text-sm font-bold",
                  assessment.status === "complete" && "bg-green-100 text-green-900",
                  assessment.status === "partial" && "bg-yellow-100 text-yellow-900",
                  assessment.status === "incomplete" && "bg-red-100 text-red-900",
                )}
              >
                {assessment.score}%
              </div>
              <span className="text-sm capitalize">{assessment.status}</span>
            </div>

            {assessment.missing.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-red-600">Missing required:</p>
                <ul className="space-y-0.5">
                  {assessment.missing.map((field) => (
                    <li key={field} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <AlertCircle className="size-3 text-red-500" />
                      {formatDocFieldLabel(field)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {assessment.recommended.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Recommended:</p>
                <ul className="space-y-0.5">
                  {assessment.recommended.map((field) => (
                    <li key={field} className="text-xs text-muted-foreground">
                      · {formatDocFieldLabel(field)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Confidence */}
          <section className="rounded-lg border p-3 md:p-4">
            <h2 className="mb-2 text-sm font-medium">AI Confidence</h2>
            <p className="text-2xl font-bold">{Math.round(project.confidence * 100)}%</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
