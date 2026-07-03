import { type ReactElement, useMemo, useRef } from "react";
import { Outlet, Navigate } from "react-router";
import { AppShell } from "@/components/layout/app-shell";
import { StorageProvider } from "@/services/storage-context";
import { DriveStorageDriver } from "@/services/drive-storage-driver";
import { useAuth } from "@/services/auth-context";

export function AppLayout(): ReactElement {
  const { isAuthenticated, status } = useAuth();
  const wasAuthenticatedRef = useRef(isAuthenticated);

  const driver = useMemo(() => new DriveStorageDriver(), []);

  if (status === "authenticating") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Signing in…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // If the user was previously authenticated in this layout (i.e. they
    // signed out), redirect with ?signed_out=1 so the landing page can show
    // a confirmation banner. Otherwise just redirect cleanly.
    const signedOutParam = wasAuthenticatedRef.current ? "?signed_out=1" : "";
    return <Navigate to={`/${signedOutParam}`} replace />;
  }

  wasAuthenticatedRef.current = true;

  return (
    <StorageProvider driver={driver}>
      <AppShell>
        <Outlet />
      </AppShell>
    </StorageProvider>
  );
}
