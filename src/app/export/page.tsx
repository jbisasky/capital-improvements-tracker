import { type ReactElement, useState } from "react";
import { Download } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { useStorage } from "@/services/storage-context";
import { trackExport } from "@/services/analytics";
import {
  CapitalImprovementsPdf,
  filterProjectsByScope,
  getAvailableYears,
  type ExportScope,
} from "./pdf-document";

type ExportFormat = "json" | "csv" | "pdf";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function ExportPage(): ReactElement {
  const { manifest } = useStorage();
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [scope, setScope] = useState<ExportScope>("all");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleExport(): Promise<void> {
    if (!manifest) return;

    const scopedProjects = filterProjectsByScope(
      manifest.projects,
      scope,
      scope === "year" ? selectedYear : undefined,
    );

    let content: string | Blob;
    let filename: string;
    let mimeType: string;
    const dateSuffix = new Date().toISOString().slice(0, 10);
    const yearSuffix = scope === "year" && selectedYear ? `-${selectedYear}` : "";

    if (format === "json") {
      content = JSON.stringify(manifest, null, 2);
      filename = `capital-improvements${yearSuffix}-${dateSuffix}.json`;
      mimeType = "application/json";
    } else if (format === "csv") {
      const headers = [
        "Title",
        "Date",
        "Tax Treatment",
        "Total Cost",
        "Cost Basis",
        "Deductible",
        "Vendor",
        "Category",
      ];
      const rows = scopedProjects.map((p) => [
        `"${p.title.replace(/"/g, '""')}"`,
        p.completionDate,
        p.taxTreatment,
        formatCurrency(p.totalCost),
        formatCurrency(p.costBasisAdjustment),
        formatCurrency(p.deductibleAmount),
        p.vendorName ?? "",
        p.category ?? "",
      ]);
      content = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      filename = `capital-improvements${yearSuffix}-${dateSuffix}.csv`;
      mimeType = "text/csv";
    } else {
      setIsGenerating(true);
      try {
        const blob = await pdf(
          <CapitalImprovementsPdf
            manifest={manifest}
            projects={scopedProjects}
            scope={scope}
            year={scope === "year" ? selectedYear : undefined}
          />,
        ).toBlob();
        filename = `capital-improvements${yearSuffix}-${dateSuffix}.pdf`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        trackExport("pdf");
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    trackExport(format);
  }

  if (!manifest) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Export</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const availableYears = getAvailableYears(manifest.projects);
  const effectiveYear = selectedYear || availableYears[0] || "";
  const scopedCount = filterProjectsByScope(
    manifest.projects,
    scope,
    scope === "year" ? effectiveYear : undefined,
  ).length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Export</h1>
      <p className="text-muted-foreground">
        Download your capital improvements data for tax preparation or backup.
      </p>

      <div className="max-w-md space-y-5 rounded-lg border p-5">
        {/* Format */}
        <fieldset>
          <legend className="mb-2 block text-sm font-medium">Format</legend>
          <div className="space-y-2">
            {(
              [
                {
                  value: "pdf",
                  label: "PDF summary",
                  desc: "Presentation-ready report for your accountant or records",
                },
                {
                  value: "csv",
                  label: "CSV",
                  desc: "Spreadsheet-friendly summary table",
                },
                {
                  value: "json",
                  label: "manifest.json",
                  desc: "Full backup — all fields, all data",
                },
              ] as { value: ExportFormat; label: string; desc: string }[]
            ).map(({ value, label, desc }) => (
              <label
                key={value}
                className="flex cursor-pointer items-start gap-3 rounded-md border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <input
                  type="radio"
                  name="format"
                  value={value}
                  checked={format === value}
                  onChange={() => { setFormat(value); }}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                </div>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Scope */}
        <fieldset>
          <legend className="mb-2 block text-sm font-medium">Scope</legend>
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-3 rounded-md border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input
                type="radio"
                name="scope"
                value="all"
                checked={scope === "all"}
                onChange={() => { setScope("all"); }}
              />
              <span className="text-sm">All projects</span>
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-md border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input
                type="radio"
                name="scope"
                value="year"
                checked={scope === "year"}
                onChange={() => {
                  setScope("year");
                  if (!selectedYear && availableYears.length > 0) {
                    setSelectedYear(availableYears[0]);
                  }
                }}
              />
              <span className="text-sm">By tax year</span>
              {scope === "year" && availableYears.length > 0 && (
                <select
                  value={effectiveYear}
                  onChange={(e) => { setSelectedYear(e.target.value); }}
                  className="ml-auto rounded-md border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
                  onClick={(e) => { e.stopPropagation(); }}
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              )}
            </label>
          </div>
        </fieldset>

        <div className="text-sm text-muted-foreground">
          {scopedCount} project{scopedCount !== 1 ? "s" : ""} will be exported.
        </div>

        <p className="text-xs text-muted-foreground">
          Note: Attachments live in your Drive folder &ldquo;Capital
          Improvements (App Data)&rdquo; and are not bundled here.
        </p>

        <button
          type="button"
          onClick={() => { void handleExport(); }}
          disabled={scopedCount === 0 || isGenerating}
          className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="size-4" />
          {isGenerating
            ? "Generating…"
            : `Download ${format.toUpperCase()}`}
        </button>
      </div>
    </div>
  );
}
