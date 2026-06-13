import { type TaxTreatment, type ImprovementCategory, type PaymentMethod, type EnergyCreditType } from "@/domain/schemas";

export interface ProjectFormData {
  title: string;
  completionDate: string;
  totalCost: string;
  taxTreatment: TaxTreatment;
  costBasisAdjustment: string;
  deductibleAmount: string;
  irsJustification: string;
  category: ImprovementCategory | "";
  vendorName: string;
  vendorTin: string;
  paymentMethod: PaymentMethod | "";
  datePaymentMade: string;
  permitNumber: string;
  usefulLifeYears: string;
  depreciationStartDate: string;
  energyCreditType: EnergyCreditType | "";
  safeHarborElection: boolean;
  sqftAffected: string;
  notes: string;
}

export const EMPTY_FORM: ProjectFormData = {
  title: "",
  completionDate: "",
  totalCost: "",
  taxTreatment: "unknown",
  costBasisAdjustment: "",
  deductibleAmount: "",
  irsJustification: "",
  category: "",
  vendorName: "",
  vendorTin: "",
  paymentMethod: "",
  datePaymentMade: "",
  permitNumber: "",
  usefulLifeYears: "",
  depreciationStartDate: "",
  energyCreditType: "",
  safeHarborElection: false,
  sqftAffected: "",
  notes: "",
};
