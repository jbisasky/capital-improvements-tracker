/**
 * AI extraction review step — shows extracted fields with confidence
 * indicators, allows editing, and requires explicit confirmation.
 * See LLD §9 and UI/UX §5.5.
 */

import { type ReactElement, useState } from "react";
import {
  type ExtractionResult,
  type TaxTreatment,
  type ImprovementCategory,
  type PaymentMethod,
} from "@/domain/schemas";

interface ExtractionReviewProps {
  extraction: ExtractionResult;
  filename: string;
  onAccept: (edited: ExtractionResult) => void;
  onDiscard: () => void;
}

type FieldKey = keyof ExtractionResult;

const TREATMENT_LABELS: Record<TaxTreatment, string> = {
  capital_improvement: "Capital Improvement",
  repair: "Repair",
  deductible: "Deductible",
  credit: "Tax Credit",
  unknown: "Unknown",
};

const CATEGORY_LABELS: Record<ImprovementCategory, string> = {
  roof: "Roof",
  hvac: "HVAC",
  plumbing: "Plumbing",
  electrical: "Electrical",
  landscaping: "Landscaping",
  kitchen: "Kitchen",
  bathroom: "Bathroom",
  flooring: "Flooring",
  windows_doors: "Windows & Doors",
  insulation: "Insulation",
  foundation: "Foundation",
  energy_efficiency: "Energy Efficiency",
  accessibility: "Accessibility",
  security: "Security",
  other: "Other",
};

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  check: "Check",
  credit_card: "Credit Card",
  financing: "Financing",
  mixed: "Mixed",
};

function ConfidenceBadge({ confidence }: { confidence: number }): ReactElement {
  const pct = Math.round(confidence * 100);
  let color = "bg-green-100 text-green-700";
  if (confidence < 0.6) color = "bg-red-100 text-red-700";
  else if (confidence < 0.8) color = "bg-yellow-100 text-yellow-700";

  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {String(pct)}% confidence
    </span>
  );
}

function FieldMarker({ edited }: { edited: boolean }): ReactElement {
  if (edited) {
    return <span className="text-xs text-muted-foreground">(edited)</span>;
  }
  return <span className="text-xs text-purple-600">✦ extracted</span>;
}

export function ExtractionReview({
  extraction,
  filename,
  onAccept,
  onDiscard,
}: ExtractionReviewProps): ReactElement {
  const [fields, setFields] = useState<ExtractionResult>({ ...extraction });
  const [editedFields, setEditedFields] = useState<Set<FieldKey>>(new Set());

  function markEdited(field: FieldKey): void {
    setEditedFields((prev) => new Set(prev).add(field));
  }

  function updateField<K extends FieldKey>(field: K, value: ExtractionResult[K]): void {
    setFields((prev) => ({ ...prev, [field]: value }));
    markEdited(field);
  }

  return (
    <div className="space-y-6 rounded-lg border p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">Review Extracted Details</h2>
          <p className="text-sm text-muted-foreground">
            From <span className="font-medium">{filename}</span>. Check &amp; edit
            before saving — nothing is stored until you confirm.
          </p>
        </div>
        <ConfidenceBadge confidence={fields.confidence} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Title */}
        <div className="sm:col-span-2">
          <div className="mb-1 flex items-center gap-2">
            <label htmlFor="ext-title" className="text-xs font-medium text-muted-foreground">
              Title
            </label>
            <FieldMarker edited={editedFields.has("title")} />
          </div>
          <input
            id="ext-title"
            type="text"
            value={fields.title}
            onChange={(e) => { updateField("title", e.target.value); }}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Completion Date */}
        <div>
          <div className="mb-1 flex items-center gap-2">
            <label htmlFor="ext-date" className="text-xs font-medium text-muted-foreground">
              Date
            </label>
            <FieldMarker edited={editedFields.has("completionDate")} />
          </div>
          <input
            id="ext-date"
            type="date"
            value={fields.completionDate ?? ""}
            onChange={(e) => { updateField("completionDate", e.target.value || null); }}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Total Cost */}
        <div>
          <div className="mb-1 flex items-center gap-2">
            <label htmlFor="ext-cost" className="text-xs font-medium text-muted-foreground">
              Total Cost ($)
            </label>
            <FieldMarker edited={editedFields.has("totalCost")} />
          </div>
          <input
            id="ext-cost"
            type="number"
            min="0"
            step="0.01"
            value={fields.totalCost ?? ""}
            onChange={(e) => {
              const val = e.target.value === "" ? null : parseFloat(e.target.value);
              updateField("totalCost", val);
            }}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Vendor */}
        <div>
          <div className="mb-1 flex items-center gap-2">
            <label htmlFor="ext-vendor" className="text-xs font-medium text-muted-foreground">
              Vendor
            </label>
            <FieldMarker edited={editedFields.has("vendor")} />
          </div>
          <input
            id="ext-vendor"
            type="text"
            value={fields.vendor ?? ""}
            onChange={(e) => { updateField("vendor", e.target.value || null); }}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Category */}
        <div>
          <div className="mb-1 flex items-center gap-2">
            <label htmlFor="ext-category" className="text-xs font-medium text-muted-foreground">
              Category
            </label>
            <FieldMarker edited={editedFields.has("category")} />
          </div>
          <select
            id="ext-category"
            value={fields.category ?? ""}
            onChange={(e) => {
              updateField("category", (e.target.value || null) as ImprovementCategory | null);
            }}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Not determined</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Tax Treatment */}
        <div>
          <div className="mb-1 flex items-center gap-2">
            <label htmlFor="ext-treatment" className="text-xs font-medium text-muted-foreground">
              Suggested Tax Treatment
            </label>
            <FieldMarker edited={editedFields.has("suggestedTreatment")} />
          </div>
          <select
            id="ext-treatment"
            value={fields.suggestedTreatment}
            onChange={(e) => {
              updateField("suggestedTreatment", e.target.value as TaxTreatment);
            }}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {Object.entries(TREATMENT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Payment Method */}
        <div>
          <div className="mb-1 flex items-center gap-2">
            <label htmlFor="ext-payment" className="text-xs font-medium text-muted-foreground">
              Payment Method
            </label>
            <FieldMarker edited={editedFields.has("paymentMethod")} />
          </div>
          <select
            id="ext-payment"
            value={fields.paymentMethod ?? ""}
            onChange={(e) => {
              updateField("paymentMethod", (e.target.value || null) as PaymentMethod | null);
            }}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Not determined</option>
            {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Cost Basis Adjustment */}
        <div>
          <div className="mb-1 flex items-center gap-2">
            <label htmlFor="ext-basis" className="text-xs font-medium text-muted-foreground">
              Cost Basis Adjustment ($)
            </label>
            <FieldMarker edited={editedFields.has("costBasisAdjustment")} />
          </div>
          <input
            id="ext-basis"
            type="number"
            min="0"
            step="0.01"
            value={fields.costBasisAdjustment ?? ""}
            onChange={(e) => {
              const val = e.target.value === "" ? null : parseFloat(e.target.value);
              updateField("costBasisAdjustment", val);
            }}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Deductible Amount */}
        <div>
          <div className="mb-1 flex items-center gap-2">
            <label htmlFor="ext-deductible" className="text-xs font-medium text-muted-foreground">
              Deductible Amount ($)
            </label>
            <FieldMarker edited={editedFields.has("deductibleAmount")} />
          </div>
          <input
            id="ext-deductible"
            type="number"
            min="0"
            step="0.01"
            value={fields.deductibleAmount ?? ""}
            onChange={(e) => {
              const val = e.target.value === "" ? null : parseFloat(e.target.value);
              updateField("deductibleAmount", val);
            }}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* IRS Justification */}
        <div className="sm:col-span-2">
          <div className="mb-1 flex items-center gap-2">
            <label htmlFor="ext-justification" className="text-xs font-medium text-muted-foreground">
              IRS Justification
            </label>
            <FieldMarker edited={editedFields.has("irsJustification")} />
          </div>
          <textarea
            id="ext-justification"
            rows={3}
            value={fields.irsJustification}
            onChange={(e) => { updateField("irsJustification", e.target.value); }}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Permit Number */}
        <div>
          <div className="mb-1 flex items-center gap-2">
            <label htmlFor="ext-permit" className="text-xs font-medium text-muted-foreground">
              Permit Number
            </label>
            <FieldMarker edited={editedFields.has("permitNumber")} />
          </div>
          <input
            id="ext-permit"
            type="text"
            value={fields.permitNumber ?? ""}
            onChange={(e) => { updateField("permitNumber", e.target.value || null); }}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t pt-4">
        <button
          type="button"
          onClick={onDiscard}
          className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={() => { onAccept(fields); }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          Looks good — continue
        </button>
      </div>
    </div>
  );
}
