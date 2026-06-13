import { type ReactElement } from "react";

export function DemoDashboardPage(): ReactElement {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Demo Dashboard</h1>
      <p className="text-muted-foreground">
        Demo mode with fixture data. All mutations are no-ops.
      </p>
    </div>
  );
}
