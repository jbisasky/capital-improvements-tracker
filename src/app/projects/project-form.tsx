import { type ReactElement, useState } from "react";
import { type TaxTreatment, type ImprovementCategory, type PaymentMethod, type EnergyCreditType } from "@/domain/schemas";
import { type ProjectFormData, EMPTY_FORM } from "@/app/projects/project-form-types";

export type { ProjectFormData } from "@/app/projects/project-form-types";

interface ProjectFormProps {
  initial?: ProjectFormData;
  onSubmit: (data: ProjectFormData) => void;
  submitLabel: string;
}

const TREATMENT_OPTIONS: { value: TaxTreatment; label: string }[] = [
  { value: "capital_improvement", label: "Capital Improvement" },
  { value: "repair", label: "Repair" },
  { value: "deductible", label: "Deductible" },
  { value: "credit", label: "Tax Credit" },
  { value: "unknown", label: "Unknown / Classify Later" },
];

const CATEGORY_OPTIONS: { value: ImprovementCategory; label: string }[] = [
  { value: "roof", label: "Roof" },
  { value: "hvac", label: "HVAC" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "kitchen", label: "Kitchen" },
  { value: "bathroom", label: "Bathroom" },
  { value: "flooring", label: "Flooring" },
  { value: "windows_doors", label: "Windows & Doors" },
  { value: "insulation", label: "Insulation" },
  { value: "landscaping", label: "Landscaping" },
  { value: "foundation", label: "Foundation / Structural" },
  { value: "energy_efficiency", label: "Energy Efficiency" },
  { value: "accessibility", label: "Accessibility" },
  { value: "security", label: "Security" },
  { value: "other", label: "Other" },
];

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "credit_card", label: "Credit Card" },
  { value: "financing", label: "Financing" },
  { value: "mixed", label: "Mixed" },
];

const ENERGY_OPTIONS: { value: EnergyCreditType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "25c_efficiency", label: "25C Efficiency" },
  { value: "25d_solar", label: "25D Solar" },
  { value: "45l", label: "45L" },
];

export function ProjectForm({ initial, onSubmit, submitLabel }: ProjectFormProps): ReactElement {
  const [form, setForm] = useState<ProjectFormData>(initial ?? EMPTY_FORM);
  const [showIrs, setShowIrs] = useState(
    !!(initial?.vendorName ?? initial?.permitNumber ?? initial?.category),
  );

  function handleChange(field: keyof ProjectFormData, value: string | boolean): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>): void {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Core fields */}
      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="text-sm font-medium">Basic Information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="title" className="mb-1 block text-xs font-medium text-muted-foreground">
              Title *
            </label>
            <input
              id="title"
              required
              type="text"
              value={form.title}
              onChange={(e) => { handleChange("title", e.target.value); }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="completionDate" className="mb-1 block text-xs font-medium text-muted-foreground">
              Completion Date *
            </label>
            <input
              id="completionDate"
              required
              type="date"
              value={form.completionDate}
              onChange={(e) => { handleChange("completionDate", e.target.value); }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="totalCost" className="mb-1 block text-xs font-medium text-muted-foreground">
              Total Cost ($) *
            </label>
            <input
              id="totalCost"
              required
              type="number"
              min="0"
              step="0.01"
              value={form.totalCost}
              onChange={(e) => { handleChange("totalCost", e.target.value); }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="taxTreatment" className="mb-1 block text-xs font-medium text-muted-foreground">
              Tax Treatment *
            </label>
            <select
              id="taxTreatment"
              value={form.taxTreatment}
              onChange={(e) => { handleChange("taxTreatment", e.target.value); }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {TREATMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="costBasisAdjustment" className="mb-1 block text-xs font-medium text-muted-foreground">
              Cost Basis Adjustment ($)
            </label>
            <input
              id="costBasisAdjustment"
              type="number"
              min="0"
              step="0.01"
              value={form.costBasisAdjustment}
              onChange={(e) => { handleChange("costBasisAdjustment", e.target.value); }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="deductibleAmount" className="mb-1 block text-xs font-medium text-muted-foreground">
              Deductible Amount ($)
            </label>
            <input
              id="deductibleAmount"
              type="number"
              min="0"
              step="0.01"
              value={form.deductibleAmount}
              onChange={(e) => { handleChange("deductibleAmount", e.target.value); }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="irsJustification" className="mb-1 block text-xs font-medium text-muted-foreground">
              IRS Justification
            </label>
            <textarea
              id="irsJustification"
              rows={3}
              value={form.irsJustification}
              onChange={(e) => { handleChange("irsJustification", e.target.value); }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* IRS Details (expandable) */}
      <div className="rounded-lg border p-4">
        <button
          type="button"
          onClick={() => { setShowIrs(!showIrs); }}
          className="flex w-full items-center justify-between text-sm font-medium"
        >
          IRS Details (optional)
          <span className="text-muted-foreground">{showIrs ? "▾" : "▸"}</span>
        </button>
        {showIrs && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="category" className="mb-1 block text-xs font-medium text-muted-foreground">
                Category
              </label>
              <select
                id="category"
                value={form.category}
                onChange={(e) => { handleChange("category", e.target.value); }}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select...</option>
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="vendorName" className="mb-1 block text-xs font-medium text-muted-foreground">
                Vendor Name
              </label>
              <input
                id="vendorName"
                type="text"
                value={form.vendorName}
                onChange={(e) => { handleChange("vendorName", e.target.value); }}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="vendorTin" className="mb-1 block text-xs font-medium text-muted-foreground">
                Vendor TIN (EIN)
              </label>
              <input
                id="vendorTin"
                type="text"
                placeholder="XX-XXXXXXX"
                value={form.vendorTin}
                onChange={(e) => { handleChange("vendorTin", e.target.value); }}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="paymentMethod" className="mb-1 block text-xs font-medium text-muted-foreground">
                Payment Method
              </label>
              <select
                id="paymentMethod"
                value={form.paymentMethod}
                onChange={(e) => { handleChange("paymentMethod", e.target.value); }}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select...</option>
                {PAYMENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="datePaymentMade" className="mb-1 block text-xs font-medium text-muted-foreground">
                Date Payment Made
              </label>
              <input
                id="datePaymentMade"
                type="date"
                value={form.datePaymentMade}
                onChange={(e) => { handleChange("datePaymentMade", e.target.value); }}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="permitNumber" className="mb-1 block text-xs font-medium text-muted-foreground">
                Permit Number
              </label>
              <input
                id="permitNumber"
                type="text"
                value={form.permitNumber}
                onChange={(e) => { handleChange("permitNumber", e.target.value); }}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="energyCreditType" className="mb-1 block text-xs font-medium text-muted-foreground">
                Energy Credit Type
              </label>
              <select
                id="energyCreditType"
                value={form.energyCreditType}
                onChange={(e) => { handleChange("energyCreditType", e.target.value); }}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select...</option>
                {ENERGY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="usefulLifeYears" className="mb-1 block text-xs font-medium text-muted-foreground">
                Useful Life (years)
              </label>
              <input
                id="usefulLifeYears"
                type="number"
                min="0"
                step="0.5"
                value={form.usefulLifeYears}
                onChange={(e) => { handleChange("usefulLifeYears", e.target.value); }}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="depreciationStartDate" className="mb-1 block text-xs font-medium text-muted-foreground">
                Depreciation Start Date
              </label>
              <input
                id="depreciationStartDate"
                type="date"
                value={form.depreciationStartDate}
                onChange={(e) => { handleChange("depreciationStartDate", e.target.value); }}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="sqftAffected" className="mb-1 block text-xs font-medium text-muted-foreground">
                Sq Ft Affected
              </label>
              <input
                id="sqftAffected"
                type="number"
                min="0"
                value={form.sqftAffected}
                onChange={(e) => { handleChange("sqftAffected", e.target.value); }}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                id="safeHarborElection"
                type="checkbox"
                checked={form.safeHarborElection}
                onChange={(e) => { handleChange("safeHarborElection", e.target.checked); }}
                className="size-4 rounded border"
              />
              <label htmlFor="safeHarborElection" className="text-sm">
                Safe Harbor Election (de minimis ≤ $2,500)
              </label>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="notes" className="mb-1 block text-xs font-medium text-muted-foreground">
                Notes
              </label>
              <textarea
                id="notes"
                rows={3}
                value={form.notes}
                onChange={(e) => { handleChange("notes", e.target.value); }}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Any additional details for audit documentation..."
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
