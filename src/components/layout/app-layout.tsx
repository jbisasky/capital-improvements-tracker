import { type ReactElement } from "react";
import { Outlet } from "react-router";
import { AppShell } from "@/components/layout/app-shell";

export function AppLayout(): ReactElement {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
