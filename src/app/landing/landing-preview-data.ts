import { assessDocumentation, type DocStatus } from "@/domain/doc-completeness";
import { DEMO_MANIFEST } from "@/services/fixtures";

export interface LandingPreviewProject {
  title: string;
  completionDate: string;
  totalCost: number;
  status: DocStatus;
  missingCount: number;
}

export interface LandingPreviewData {
  costBasisAdded: number;
  totalSpent: number;
  projectCount: number;
  docsCompleteCount: number;
  recentProjects: LandingPreviewProject[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getLandingPreviewData(): LandingPreviewData {
  const propertyType = DEMO_MANIFEST.property?.propertyType;
  const projects = DEMO_MANIFEST.projects;
  const assessments = projects.map((project) => ({
    project,
    assessment: assessDocumentation(project, propertyType),
  }));

  const completeCount = assessments.filter(
    ({ assessment }) => assessment.status === "complete",
  ).length;

  const totalSpent = projects.reduce((sum, project) => sum + project.totalCost, 0);

  const recentProjects = [...assessments]
    .sort((a, b) => b.project.updatedAt.localeCompare(a.project.updatedAt))
    .slice(0, 4)
    .map(({ project, assessment }) => ({
      title: project.title,
      completionDate: project.completionDate,
      totalCost: project.totalCost,
      status: assessment.status,
      missingCount: assessment.missing.length,
    }));

  return {
    costBasisAdded: DEMO_MANIFEST.summary.totalCostBasisAdded,
    totalSpent,
    projectCount: projects.length,
    docsCompleteCount: completeCount,
    recentProjects,
  };
}

export function formatLandingPreviewCurrency(amount: number): string {
  return formatCurrency(amount);
}

export const LANDING_PREVIEW_DATA = getLandingPreviewData();
