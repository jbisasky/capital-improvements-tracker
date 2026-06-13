import { type ReactElement } from "react";

export function AboutPage(): ReactElement {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">About</h1>
      <p className="text-muted-foreground">
        App version, privacy explainer, and disclaimer will appear here.
      </p>
    </div>
  );
}
