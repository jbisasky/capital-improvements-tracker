import { type Project, type PropertyType, type TaxTreatment } from "@/domain/schemas";
import { shouldRecommendReceiptDetail } from "@/domain/receipt-detail-level";

export type DocStatus = "complete" | "partial" | "incomplete";

export interface DocAssessment {
  status: DocStatus;
  missing: string[];
  recommended: string[];
  score: number;
}

interface FieldRules {
  required: string[];
  recommended: string[];
}

const BASE_RULES: Record<TaxTreatment, FieldRules> = {
  capital_improvement: {
    required: [
      "title",
      "completionDate",
      "totalCost",
      "attachments",
      "irsJustification",
      "vendorName",
    ],
    recommended: ["category", "paymentMethod", "permitNumber", "notes"],
  },
  repair: {
    required: ["title", "completionDate", "totalCost", "attachments"],
    recommended: ["vendorName", "category", "paymentMethod"],
  },
  deductible: {
    required: [
      "title",
      "completionDate",
      "totalCost",
      "attachments",
      "irsJustification",
    ],
    recommended: ["vendorName", "category", "paymentMethod"],
  },
  credit: {
    required: [
      "title",
      "completionDate",
      "totalCost",
      "attachments",
      "energyCreditType",
      "vendorName",
    ],
    recommended: ["permitNumber", "notes"],
  },
  unknown: {
    required: ["title", "completionDate", "totalCost"],
    recommended: [],
  },
};

function isFieldPresent(project: Project, field: string): boolean {
  if (field === "attachments") {
    return project.attachments.length > 0;
  }
  const value = project[field as keyof Project];
  if (value === undefined) return false;
  if (typeof value === "string") return value.length > 0;
  return true;
}

export function assessDocumentation(
  project: Project,
  propertyType: PropertyType | undefined,
): DocAssessment {
  const rules = BASE_RULES[project.taxTreatment];
  const required = [...rules.required];
  const recommended = [...rules.recommended];

  // Property-type modifiers
  if (
    propertyType === "rental" &&
    project.taxTreatment === "capital_improvement"
  ) {
    required.push("usefulLifeYears", "depreciationStartDate");
  }
  if (propertyType === "home_office") {
    required.push("sqftAffected");
  }

  const missing: string[] = [];
  const missingRecommended: string[] = [];

  for (const field of required) {
    if (!isFieldPresent(project, field)) {
      missing.push(field);
    }
  }

  for (const field of recommended) {
    if (!isFieldPresent(project, field)) {
      missingRecommended.push(field);
    }
  }

  if (shouldRecommendReceiptDetail(project)) {
    missingRecommended.push("receiptDetailLevel");
  }

  const filledCount = required.length - missing.length;
  const score =
    required.length > 0 ? Math.round((filledCount / required.length) * 100) : 100;

  let status: DocStatus;
  if (score === 100) {
    status = "complete";
  } else if (score >= 50) {
    status = "partial";
  } else {
    status = "incomplete";
  }

  return { status, missing, recommended: missingRecommended, score };
}
