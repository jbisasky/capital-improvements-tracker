import { type ReactElement } from "react";

/** Inline spinner for lazy route chunks — keeps AppShell/banner mounted. */
export function PageContentLoader(): ReactElement {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
