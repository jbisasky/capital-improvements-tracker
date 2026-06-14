import { type ReactElement } from "react";
import { Outlet } from "react-router";
import { AuthProvider } from "@/services/auth-context";

export function RootLayout(): ReactElement {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
