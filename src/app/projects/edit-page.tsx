import { type ReactElement } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { useStorage } from "@/services/storage-context";
import { ProjectForm, type ProjectFormData } from "@/app/projects/project-form";
import { type Project } from "@/domain/schemas";

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
  };
}

export function ProjectEditPage(): ReactElement {
  const { id } = useParams();
  const navigate = useNavigate();
  const { manifest, loading, updateProject } = useStorage();

  if (loading || !manifest) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  const project = manifest.projects.find((p) => p.id === id);
  if (!project) {
    return (
      <div className="space-y-4">
        <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
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
        void navigate(`/projects/${id}`);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Link to={`/projects/${project.id}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft className="size-4" /> Back to project
      </Link>
      <h1 className="text-2xl font-semibold">Edit: {project.title}</h1>
      <ProjectForm
        initial={projectToForm(project)}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
      />
    </div>
  );
}
