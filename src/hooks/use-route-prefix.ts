import { useLocation } from "react-router";

export function useRoutePrefix(): string {
  const location = useLocation();
  return location.pathname.startsWith("/demo") ? "/demo" : "";
}
