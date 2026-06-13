import { type ReactElement } from "react";
import { Outlet } from "react-router";

export function RootLayout(): ReactElement {
  return <Outlet />;
}
