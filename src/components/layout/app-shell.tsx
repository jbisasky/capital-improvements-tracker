import { type ReactElement, type ReactNode } from "react";
import { Link, NavLink } from "react-router";
import {
  LayoutDashboard,
  FolderOpen,
  Settings,
  Download,
  Info,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HomeChartLogo } from "@/components/brand/home-chart-logo";
import { useRoutePrefix } from "@/hooks/use-route-prefix";
import { useAuth } from "@/services/auth-context";

interface AppShellProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projects", icon: FolderOpen },
  { to: "/export", label: "Export", icon: Download },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/about", label: "About", icon: Info },
] as const;

export function AppShell({ children }: AppShellProps): ReactElement {
  const prefix = useRoutePrefix();
  const auth = useAuth();
  const isLiveMode = prefix === "";

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-zinc-100 bg-sidebar md:block">
        <div className="flex h-14 items-center gap-2 border-b border-zinc-100 px-4">
          <HomeChartLogo decorative className="size-5 text-primary" />
          <span className="text-sm font-semibold tracking-tight text-zinc-900">
            Capital Tracker
          </span>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={`${prefix}${to}`}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-zinc-100 text-primary"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-800",
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-zinc-100 p-3">
          {isLiveMode ? (
            <button
              type="button"
              onClick={auth.signOut}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-800"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          ) : (
            <Link
              to="/"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-800"
            >
              <LogOut className="size-4" />
              Exit Demo
            </Link>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Mobile top bar — hidden at md+; shows session action top-right on all pages */}
        <header
          data-testid="mobile-top-bar"
          className="flex items-center justify-between border-b border-zinc-100 bg-background px-4 py-2.5 md:hidden"
        >
          <div className="flex items-center gap-2">
            <HomeChartLogo decorative className="size-4 text-primary" />
            <span className="text-sm font-semibold tracking-tight text-zinc-900">
              Capital Tracker
            </span>
          </div>
          {isLiveMode ? (
            <button
              type="button"
              onClick={auth.signOut}
              className="flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-800"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          ) : (
            <Link
              to="/"
              className="flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-800"
            >
              <LogOut className="size-4" />
              Exit Demo
            </Link>
          )}
        </header>
        <main className="flex-1 p-6 pb-20 md:pb-6">{children}</main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-zinc-100 bg-background md:hidden">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={`${prefix}${to}`}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors",
                isActive
                  ? "text-primary"
                  : "text-zinc-600 hover:text-zinc-800",
              )
            }
          >
            <Icon className="size-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
