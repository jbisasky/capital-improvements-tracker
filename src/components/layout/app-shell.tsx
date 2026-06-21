import { type ReactElement, type ReactNode, useState } from "react";
import { Link, NavLink } from "react-router";
import {
  LayoutDashboard,
  FolderOpen,
  Settings,
  Download,
  Info,
  LogOut,
  Menu,
  PanelLeftClose,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HomeChartLogo } from "@/components/brand/home-chart-logo";
import { OfflineBanner } from "@/components/layout/offline-banner";
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
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col bg-sidebar md:flex",
          "h-full overflow-hidden",
          "transition-[width] duration-200 ease-in-out",
          collapsed ? "w-14" : "w-60",
        )}
        style={{ boxShadow: "4px 0 16px 0 rgba(0,0,0,0.06)" }}
      >
        {/* Brand header — full width, never truncated */}
        <div className="flex h-14 shrink-0 items-center border-b border-zinc-100">
          {collapsed ? (
            <button
              type="button"
              aria-label="Expand sidebar"
              onClick={() => { setCollapsed(false); }}
              className="flex w-full items-center justify-center text-zinc-500 transition-colors hover:text-zinc-900"
            >
              <Menu className="size-6" />
            </button>
          ) : (
            <>
              <Link
                to={`${prefix}/dashboard`}
                className="flex min-w-0 flex-1 items-center gap-2 pl-4 transition-opacity hover:opacity-80"
              >
                <HomeChartLogo decorative className="size-5 shrink-0 text-primary" />
                <span className="truncate text-sm font-semibold tracking-tight text-zinc-900">
                  Capital Improvements
                </span>
              </Link>
              <button
                type="button"
                aria-label="Collapse sidebar"
                onClick={() => { setCollapsed(true); }}
                className="shrink-0 px-3 text-zinc-400 transition-colors hover:text-zinc-700"
              >
                <PanelLeftClose className="size-5" />
              </button>
            </>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex flex-1 flex-col gap-1 p-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={`${prefix}${to}`}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  "flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors",
                  collapsed ? "justify-center" : "gap-3 px-3",
                  isActive
                    ? "bg-zinc-100 text-primary"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-800",
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle + sign out / exit demo */}
        <div className="shrink-0 border-t border-zinc-100 p-2">

          {isLiveMode ? (
            <button
              type="button"
              title={collapsed ? "Sign out" : undefined}
              onClick={auth.signOut}
              className={cn(
                "flex w-full items-center rounded-md px-2 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-800",
                collapsed ? "justify-center" : "gap-3 px-3",
              )}
            >
              <LogOut className="size-4 shrink-0" />
              {!collapsed && "Sign out"}
            </button>
          ) : (
            <Link
              to="/"
              title={collapsed ? "Exit Demo" : undefined}
              className={cn(
                "flex w-full items-center rounded-md px-2 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-800",
                collapsed ? "justify-center" : "gap-3 px-3",
              )}
            >
              <LogOut className="size-4 shrink-0" />
              {!collapsed && "Exit Demo"}
            </Link>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <OfflineBanner />
        {/* Mobile top bar — hidden at md+; shows session action top-right on all pages */}
        <header
          data-testid="mobile-top-bar"
          className="flex items-center justify-between border-b border-zinc-100 bg-background px-4 py-2.5 md:hidden"
        >
          <Link
            to={`${prefix}/dashboard`}
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <HomeChartLogo decorative className="size-4 text-primary" />
            <span className="text-sm font-semibold tracking-tight text-zinc-900">
              Capital Improvements
            </span>
          </Link>
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
        <main
          className="flex-1 overflow-y-auto p-6 pb-20 md:pb-6"
          style={{ background: "var(--canvas-gradient)" }}
        >
          {children}
        </main>
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
