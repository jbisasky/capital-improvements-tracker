import { type ReactElement } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { ArrowLeft, Pencil, Trash2, AlertCircle } from "lucide-react";
import { useStorage } from "@/services/storage-context";
import { cn } from "@/lib/utils";
import { type TaxTreatment } from "@/domain/schemas";
import { useRoutePrefix } from "@/hooks/use-route-prefix";
import { AttachmentSection } from "@/app/projects/attachment-section";

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

export function ProjectDetailPage(): ReactElement {
  const { id } = useParams();
  const navigate = useNavigate();
  const prefix = useRoutePrefix();
  const { manifest, loading, deleteProject, getDocAssessment } = useStorage();

  if (loading || !manifest) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
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
    <div className="space-y-6">
      <Link to={`${prefix}/projects`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft className="size-4" /> Back to projects
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{project.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.completionDate} · {TREATMENT_LABELS[project.taxTreatment]}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to={`${prefix}/projects/${project.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
          >
            <Pencil className="size-3.5" /> Edit
          </Link>
          <button
            type="button"
            onClick={() => { void handleDelete(); }}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 className="size-3.5" /> Delete
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Financial summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total Cost</p>
              <p className="mt-1 text-lg font-semibold">{formatCurrency(project.totalCost)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Cost Basis</p>
              <p className="mt-1 text-lg font-semibold">{formatCurrency(project.costBasisAdjustment)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Deductible</p>
              <p className="mt-1 text-lg font-semibold">{formatCurrency(project.deductibleAmount)}</p>
            </div>
          </div>

          {/* IRS Justification */}
          {project.irsJustification && (
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 text-sm font-medium">IRS Justification</h3>
              <p className="text-sm text-muted-foreground">{project.irsJustification}</p>
            </div>
          )}

          {/* Details grid */}
          <div className="rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-medium">Details</h3>
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
                  <dd className="text-sm">{project.datePaymentMade}</dd>
                </div>
              )}
              {project.permitNumber && (
                <div>
                  <dt className="text-xs text-muted-foreground">Permit #</dt>
                  <dd className="text-sm font-mono">{project.permitNumber}</dd>
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
          </div>

          {/* Notes */}
          {project.notes && (
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 text-sm font-medium">Notes</h3>
              <p className="text-sm text-muted-foreground">{project.notes}</p>
            </div>
          )}

          {/* Attachments */}
          <AttachmentSection
            projectId={project.id}
            attachments={project.attachments}
            mode="live"
          />
        </div>

        {/* Sidebar — Documentation Health */}
        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-medium">Documentation Health</h3>
            <div className="mb-3 flex items-center gap-3">
              <div
                className={cn(
                  "flex size-12 items-center justify-center rounded-full text-sm font-bold text-white",
                  assessment.status === "complete" && "bg-green-500",
                  assessment.status === "partial" && "bg-yellow-500",
                  assessment.status === "incomplete" && "bg-red-500",
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
                      {field}
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
                      · {field}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Confidence */}
          <div className="rounded-lg border p-4">
            <h3 className="mb-2 text-sm font-medium">AI Confidence</h3>
            <p className="text-2xl font-bold">{Math.round(project.confidence * 100)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
