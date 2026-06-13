import { type ReactElement } from "react";

export function ExportPage(): ReactElement {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Export</h1>
      <p className="text-muted-foreground">
        JSON/CSV/PDF export with scope selection will appear here.
      </p>
    </div>
  );
}
