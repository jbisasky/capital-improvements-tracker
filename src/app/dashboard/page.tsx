import { type ReactElement } from "react";

export function DashboardPage(): ReactElement {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-muted-foreground">
        Summary cards, recent projects, and documentation health will appear
        here.
      </p>
    </div>
  );
}
