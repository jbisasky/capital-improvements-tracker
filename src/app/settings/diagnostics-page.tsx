import { type ReactElement } from "react";

export function DiagnosticsPage(): ReactElement {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Diagnostics</h1>
      <p className="text-muted-foreground">
        Ring-buffer log viewer with redacted copy-to-clipboard will appear here.
      </p>
    </div>
  );
}
