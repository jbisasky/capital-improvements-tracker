import { z } from "zod";

// --- Enums ---

export const TaxTreatment = z.enum([
  "capital_improvement",
  "repair",
  "deductible",
  "credit",
  "unknown",
]);

export const ImprovementCategory = z.enum([
  "roof",
  "hvac",
  "plumbing",
  "electrical",
  "landscaping",
  "kitchen",
  "bathroom",
  "flooring",
  "windows_doors",
  "insulation",
  "foundation",
  "energy_efficiency",
  "accessibility",
  "security",
  "other",
]);

export const PaymentMethod = z.enum([
  "cash",
  "check",
  "credit_card",
  "financing",
  "mixed",
]);

export const EnergyCreditType = z.enum([
  "25c_efficiency",
  "25d_solar",
  "45l",
  "none",
]);

export const PropertyType = z.enum([
  "primary_residence",
  "rental",
  "home_office",
  "vacation",
]);

// --- Objects ---

export const AttachmentSchema = z.object({
  fileId: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
});

export const ProjectSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1),
  completionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalCost: z.number().nonnegative(),
  taxTreatment: TaxTreatment,
  costBasisAdjustment: z.number().nonnegative(),
  deductibleAmount: z.number().nonnegative(),
  irsJustification: z.string(),
  confidence: z.number().min(0).max(1),
  attachments: z.array(AttachmentSchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),

  // Optional IRS-relevant fields
  category: ImprovementCategory.optional(),
  vendorName: z.string().optional(),
  vendorTin: z
    .string()
    .regex(/^\d{2}-\d{7}$/)
    .optional(),
  paymentMethod: PaymentMethod.optional(),
  datePaymentMade: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  permitNumber: z.string().optional(),
  usefulLifeYears: z.number().positive().optional(),
  depreciationStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  energyCreditType: EnergyCreditType.optional(),
  safeHarborElection: z.boolean().optional(),
  sqftAffected: z.number().positive().optional(),
  notes: z.string().optional(),
});

export const PropertyProfileSchema = z.object({
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/),
  propertyType: PropertyType,
  sqftTotal: z.number().positive().optional(),
});

export const ManifestSchema = z.object({
  schemaVersion: z.literal(2),
  lastUpdated: z.iso.datetime(),
  property: PropertyProfileSchema.optional(),
  summary: z.object({
    totalCostBasisAdded: z.number().nonnegative(),
    totalDeductible: z.number().nonnegative(),
  }),
  projects: z.array(ProjectSchema),
});

export const ExtractionResultSchema = z.object({
  title: z.string().min(1),
  completionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  totalCost: z.number().nonnegative().nullable(),
  suggestedTreatment: TaxTreatment,
  costBasisAdjustment: z.number().nonnegative().nullable(),
  deductibleAmount: z.number().nonnegative().nullable(),
  irsJustification: z.string(),
  vendor: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  category: ImprovementCategory.nullable().optional(),
  paymentMethod: PaymentMethod.nullable().optional(),
  permitNumber: z.string().nullable().optional(),
});

// --- Inferred Types ---

export type TaxTreatment = z.infer<typeof TaxTreatment>;
export type ImprovementCategory = z.infer<typeof ImprovementCategory>;
export type PaymentMethod = z.infer<typeof PaymentMethod>;
export type EnergyCreditType = z.infer<typeof EnergyCreditType>;
export type PropertyType = z.infer<typeof PropertyType>;
export type Attachment = z.infer<typeof AttachmentSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type PropertyProfile = z.infer<typeof PropertyProfileSchema>;
export type Manifest = z.infer<typeof ManifestSchema>;
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;
