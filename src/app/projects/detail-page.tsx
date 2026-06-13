import { type ReactElement } from "react";
import { useParams } from "react-router";

export function ProjectDetailPage(): ReactElement {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Project Detail</h1>
      <p className="text-muted-foreground">
        Details for project <code className="text-sm">{id}</code> will appear
        here.
      </p>
    </div>
  );
}
