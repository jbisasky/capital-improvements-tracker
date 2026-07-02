import { type ReactElement } from "react";
import { Outlet } from "react-router";
import { AuthProvider } from "@/services/auth-context";
import { OfflineProvider } from "@/services/offline-context";
import { ThemeProvider } from "@/services/theme-context";
import { PwaLifecycle } from "@/components/layout/pwa-lifecycle";

export function RootLayout(): ReactElement {
  return (
    <ThemeProvider>
      <OfflineProvider>
        <PwaLifecycle>
          <AuthProvider>
            <Outlet />
          </AuthProvider>
        </PwaLifecycle>
      </OfflineProvider>
    </ThemeProvider>
  );
}
