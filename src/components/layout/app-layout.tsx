import { type ReactElement, useMemo } from "react";
import { Outlet, Navigate } from "react-router";
import { AppShell } from "@/components/layout/app-shell";
import { StorageProvider } from "@/services/storage-context";
import { DriveStorageDriver } from "@/services/drive-storage-driver";
import { useAuth } from "@/services/auth-context";

export function AppLayout(): ReactElement {
  const { isAuthenticated, status } = useAuth();

  const driver = useMemo(() => new DriveStorageDriver(), []);

  if (status === "authenticating") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Signing in…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <StorageProvider driver={driver}>
      <AppShell>
        <Outlet />
      </AppShell>
    </StorageProvider>
  );
}
