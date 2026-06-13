import { type ReactElement } from "react";
import { Outlet } from "react-router";
import { AppShell } from "@/components/layout/app-shell";
import { StorageProvider } from "@/services/storage-context";
import { MockStorageDriver } from "@/services/mock-storage-driver";
import { type Manifest } from "@/domain/schemas";

const EMPTY_MANIFEST: Manifest = {
  schemaVersion: 2,
  lastUpdated: new Date().toISOString(),
  summary: { totalCostBasisAdded: 0, totalDeductible: 0 },
  projects: [],
};

const appDriver = new MockStorageDriver(EMPTY_MANIFEST);

export function AppLayout(): ReactElement {
  return (
    <StorageProvider driver={appDriver}>
      <AppShell>
        <Outlet />
      </AppShell>
    </StorageProvider>
  );
}
