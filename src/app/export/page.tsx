import { type ReactElement, useState } from "react";
import { Download } from "lucide-react";
import { useStorage } from "@/services/storage-context";
import { trackExport } from "@/services/analytics";

type ExportFormat = "json" | "csv";

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
  const [format, setFormat] = useState<ExportFormat>("json");

  function handleExport(): void {
    if (!manifest) return;

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === "json") {
      content = JSON.stringify(manifest, null, 2);
      filename = `capital-improvements-${new Date().toISOString().slice(0, 10)}.json`;
      mimeType = "application/json";
    } else {
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
      const rows = manifest.projects.map((p) => [
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
      filename = `capital-improvements-${new Date().toISOString().slice(0, 10)}.csv`;
      mimeType = "text/csv";
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

  const projectCount = manifest?.projects.length ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Export</h1>
      <p className="text-muted-foreground">
        Download your capital improvements data for tax preparation or backup.
      </p>

      <div className="max-w-md space-y-4 rounded-lg border p-4">
        <div>
          <label htmlFor="format" className="mb-1 block text-sm font-medium">
            Export Format
          </label>
          <select
            id="format"
            value={format}
            onChange={(e) => { setFormat(e.target.value as ExportFormat); }}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="json">JSON (full manifest with all fields)</option>
            <option value="csv">CSV (summary table for spreadsheets)</option>
          </select>
        </div>

        <div className="text-sm text-muted-foreground">
          {projectCount} project{projectCount !== 1 ? "s" : ""} will be exported.
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={projectCount === 0}
          className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="size-4" />
          Export {format.toUpperCase()}
        </button>
      </div>
    </div>
  );
}
