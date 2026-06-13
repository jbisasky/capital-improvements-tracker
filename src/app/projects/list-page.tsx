import { type ReactElement } from "react";

export function ProjectsListPage(): ReactElement {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
      </div>
      <p className="text-muted-foreground">
        Project list with search, filters, and documentation status badges will
        appear here.
      </p>
    </div>
  );
}
