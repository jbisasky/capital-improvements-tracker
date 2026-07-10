import { type ReactElement } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { useStorage } from "@/services/storage-context";
import { ProjectForm, type ProjectFormData } from "@/app/projects/project-form";
import { type Project } from "@/domain/schemas";
import { useRoutePrefix } from "@/hooks/use-route-prefix";
import { trackProjectEdited } from "@/services/analytics";
import { AttachmentSection } from "@/app/projects/attachment-section";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

function projectToForm(project: Project): ProjectFormData {
  return {
    title: project.title,
    completionDate: project.completionDate,
    totalCost: String(project.totalCost),
    taxTreatment: project.taxTreatment,
    costBasisAdjustment: String(project.costBasisAdjustment),
    deductibleAmount: String(project.deductibleAmount),
    irsJustification: project.irsJustification,
    category: project.category ?? "",
    vendorName: project.vendorName ?? "",
    vendorTin: project.vendorTin ?? "",
    paymentMethod: project.paymentMethod ?? "",
    datePaymentMade: project.datePaymentMade ?? "",
    permitNumber: project.permitNumber ?? "",
    usefulLifeYears: project.usefulLifeYears != null ? String(project.usefulLifeYears) : "",
    depreciationStartDate: project.depreciationStartDate ?? "",
    energyCreditType: project.energyCreditType ?? "",
    safeHarborElection: project.safeHarborElection ?? false,
    sqftAffected: project.sqftAffected != null ? String(project.sqftAffected) : "",
    notes: project.notes ?? "",
    receiptDetailLevel: project.receiptDetailLevel ?? "",
  };
}

function formToUpdatedProject(original: Project, data: ProjectFormData): Project {
  return {
    ...original,
    title: data.title,
    completionDate: data.completionDate,
    totalCost: parseFloat(data.totalCost) || 0,
    taxTreatment: data.taxTreatment,
    costBasisAdjustment: parseFloat(data.costBasisAdjustment) || 0,
    deductibleAmount: parseFloat(data.deductibleAmount) || 0,
    irsJustification: data.irsJustification,
    updatedAt: new Date().toISOString(),
    ...(data.category ? { category: data.category } : {}),
    ...(data.vendorName ? { vendorName: data.vendorName } : {}),
    ...(data.vendorTin ? { vendorTin: data.vendorTin } : {}),
    ...(data.paymentMethod ? { paymentMethod: data.paymentMethod } : {}),
    ...(data.datePaymentMade ? { datePaymentMade: data.datePaymentMade } : {}),
    ...(data.permitNumber ? { permitNumber: data.permitNumber } : {}),
    ...(data.usefulLifeYears ? { usefulLifeYears: parseFloat(data.usefulLifeYears) } : {}),
    ...(data.depreciationStartDate ? { depreciationStartDate: data.depreciationStartDate } : {}),
    ...(data.energyCreditType ? { energyCreditType: data.energyCreditType } : {}),
    ...(data.safeHarborElection ? { safeHarborElection: true } : {}),
    ...(data.sqftAffected ? { sqftAffected: parseFloat(data.sqftAffected) } : {}),
    ...(data.notes ? { notes: data.notes } : {}),
    ...(data.receiptDetailLevel ? { receiptDetailLevel: data.receiptDetailLevel } : {}),
  };
}

function SkeletonField({
  label,
  className,
  inputClassName = "h-10 w-full",
}: {
  label: string;
  className?: string;
  inputClassName?: string;
}): ReactElement {
  return (
    <div className={className}>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <Skeleton className={inputClassName} />
    </div>
  );
}

function ProjectEditSkeleton({
  prefix,
  projectId,
}: {
  prefix: string;
  projectId: string;
}): ReactElement {
  return (
    <div className="space-y-6" data-testid="project-edit-skeleton">
      <Link
        to={`${prefix}/projects/${projectId}`}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="size-4" /> Back to project
      </Link>

      <h1 className="flex items-center gap-2 text-2xl font-semibold">
        <span>Edit:</span>
        <Skeleton className="h-8 w-48 max-w-full" />
      </h1>

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

      <div className="space-y-6">
        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="text-sm font-medium">Basic Information</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <SkeletonField label="Title *" className="sm:col-span-2" />
            <SkeletonField label="Completion Date *" />
            <SkeletonField label="Total Cost ($) *" />
            <SkeletonField label="Tax Treatment *" />
            <SkeletonField label="Cost Basis Adjustment ($)" />
            <SkeletonField label="Deductible Amount ($)" />
            <SkeletonField
              label="IRS Justification"
              className="sm:col-span-2"
              inputClassName="h-20 w-full"
            />
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex w-full items-center justify-between text-sm font-medium">
            <span>IRS Details (optional)</span>
            <span className="text-muted-foreground">▸</span>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="button" disabled>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ProjectEditPage(): ReactElement {
  const { id } = useParams();
  const navigate = useNavigate();
  const prefix = useRoutePrefix();
  const { manifest, updateProject } = useStorage();

  const isDataPending = manifest == null;

  if (isDataPending) {
    return (
      <ProjectEditSkeleton
        prefix={prefix}
        projectId={id ?? ""}
      />
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

  function handleSubmit(data: ProjectFormData): void {
    if (!project || !id) return;
    const updated = formToUpdatedProject(project, data);
    void updateProject(id, updated).then((result) => {
      if (result.ok) {
        trackProjectEdited();
        void navigate(`${prefix}/projects/${id}`);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Link to={`${prefix}/projects/${project.id}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft className="size-4" /> Back to project
      </Link>
      <h1 className="text-2xl font-semibold">Edit: {project.title}</h1>
      <AttachmentSection
        projectId={project.id}
        attachments={project.attachments}
        mode="live"
      />
      <ProjectForm
        initial={projectToForm(project)}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
      />
    </div>
  );
}
