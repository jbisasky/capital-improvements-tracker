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
  RefreshCw,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HomeChartLogo } from "@/components/brand/home-chart-logo";
import { OfflineBanner } from "@/components/layout/offline-banner";
import { useRoutePrefix } from "@/hooks/use-route-prefix";
import { useAuth } from "@/services/auth-context";
import { useStorage } from "@/services/storage-context";
import { useTheme } from "@/services/theme-context";
import { type ThemePreference } from "@/services/theme";

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

const THEME_CYCLE: Record<ThemePreference, ThemePreference> = {
  light: "dark",
  dark: "system",
  system: "light",
};

const THEME_ICON: Record<ThemePreference, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const THEME_LABEL: Record<ThemePreference, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

export function AppShell({ children }: AppShellProps): ReactElement {
  const prefix = useRoutePrefix();
  const auth = useAuth();
  const { loading, manifest } = useStorage();
  const { preference: themePreference, setPreference: setThemePreference } = useTheme();
  const isLiveMode = prefix === "";
  const [collapsed, setCollapsed] = useState(false);
  // True only during background revalidation (cached data is showing, Drive
  // fetch is still in progress). Not true on first load (manifest is null).
  const isRevalidating = loading && manifest != null;
  const ThemeIcon = THEME_ICON[themePreference];
  const cycleTheme = (): void => { setThemePreference(THEME_CYCLE[themePreference]); };

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
        <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border">
          {collapsed ? (
            <button
              type="button"
              aria-label="Expand sidebar"
              onClick={() => { setCollapsed(false); }}
              className="flex w-full cursor-pointer items-center justify-center text-sidebar-foreground/60 transition-colors hover:text-sidebar-foreground"
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
                <span className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
                  Capital Improvements
                </span>
              </Link>
              <button
                type="button"
                aria-label="Collapse sidebar"
                onClick={() => { setCollapsed(true); }}
                className="shrink-0 cursor-pointer px-3 text-sidebar-foreground/40 transition-colors hover:text-sidebar-foreground"
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
                    ? "bg-sidebar-accent text-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>

        {/* Theme toggle + sign out / exit demo */}
        <div className="shrink-0 border-t border-sidebar-border p-2">
          <button
            type="button"
            title={`Theme: ${THEME_LABEL[themePreference]} (click to cycle)`}
            aria-label={`Theme: ${THEME_LABEL[themePreference]}`}
            onClick={cycleTheme}
            className={cn(
              "flex w-full cursor-pointer items-center rounded-md px-2 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
              collapsed ? "justify-center" : "gap-3 px-3",
            )}
          >
            <ThemeIcon className="size-4 shrink-0" />
            {!collapsed && THEME_LABEL[themePreference]}
          </button>

          {isLiveMode ? (
            <button
              type="button"
              title={collapsed ? "Sign out" : undefined}
              onClick={auth.signOut}
              className={cn(
                "flex w-full cursor-pointer items-center rounded-md px-2 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
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
                "flex w-full items-center rounded-md px-2 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
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
        {isRevalidating && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center justify-center gap-1.5 bg-muted py-1 text-xs text-muted-foreground"
          >
            <RefreshCw className="size-3 animate-spin" />
            Syncing with Drive…
          </div>
        )}
        {/* Mobile top bar — hidden at md+; shows session action top-right on all pages */}
        <header
          data-testid="mobile-top-bar"
          className="flex items-center justify-between border-b border-border bg-background px-4 py-2.5 md:hidden"
        >
          <Link
            to={`${prefix}/dashboard`}
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <HomeChartLogo decorative className="size-4 text-primary" />
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Capital Improvements
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              type="button"
              title={`Theme: ${THEME_LABEL[themePreference]} (tap to cycle)`}
              aria-label={`Theme: ${THEME_LABEL[themePreference]}`}
              onClick={cycleTheme}
              className="flex cursor-pointer items-center text-muted-foreground transition-colors hover:text-foreground"
            >
              <ThemeIcon className="size-4" />
            </button>
            {isLiveMode ? (
              <button
                type="button"
                onClick={auth.signOut}
                className="flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            ) : (
              <Link
                to="/"
                className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <LogOut className="size-4" />
                Exit Demo
              </Link>
            )}
          </div>
        </header>
        <main
          className="flex-1 overflow-y-auto p-6 pb-20 md:pb-6"
          style={{ background: "var(--canvas-gradient)" }}
        >
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-border bg-background md:hidden">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={`${prefix}${to}`}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
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
