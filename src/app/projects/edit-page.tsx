import { type ReactElement } from "react";
import { useParams } from "react-router";

export function ProjectEditPage(): ReactElement {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit Project</h1>
      <p className="text-muted-foreground">
        Edit form for project <code className="text-sm">{id}</code> will appear
        here.
      </p>
    </div>
  );
}
