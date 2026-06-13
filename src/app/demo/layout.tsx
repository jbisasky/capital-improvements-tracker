import { type ReactElement } from "react";
import { Outlet } from "react-router";
import { AppShell } from "@/components/layout/app-shell";

export function DemoLayout(): ReactElement {
  return (
    <>
      <div className="fixed top-0 right-0 left-0 z-50 bg-amber-500 px-4 py-1.5 text-center text-sm font-medium text-amber-950">
        Demo Mode — data is read-only fixture data
      </div>
      <div className="pt-8">
        <AppShell>
          <Outlet />
        </AppShell>
      </div>
    </>
  );
}
