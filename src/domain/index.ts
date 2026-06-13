export { type AppError, type Ok, type Err, type Result, ok, err } from "@/domain/result";
export { type ErrorCode, appError } from "@/domain/errors";
export {
  TaxTreatment,
  ImprovementCategory,
  PaymentMethod,
  EnergyCreditType,
  PropertyType,
  AttachmentSchema,
  ProjectSchema,
  PropertyProfileSchema,
  ManifestSchema,
  ExtractionResultSchema,
  type TaxTreatment as TaxTreatmentType,
  type ImprovementCategory as ImprovementCategoryType,
  type PaymentMethod as PaymentMethodType,
  type EnergyCreditType as EnergyCreditTypeType,
  type PropertyType as PropertyTypeType,
  type Attachment,
  type Project,
  type PropertyProfile,
  type Manifest,
  type ExtractionResult,
} from "@/domain/schemas";
export {
  type DocStatus,
  type DocAssessment,
  assessDocumentation,
} from "@/domain/doc-completeness";
