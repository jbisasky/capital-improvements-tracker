/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router";
import { RootLayout } from "@/components/layout/root-layout";
import { LandingPage } from "@/app/landing/landing-page";
import { AuthCallbackPage } from "@/app/auth/callback-page";

// AppLayout and DemoLayout are lazy so their module graphs
// (DriveStorageDriver, MockStorageDriver, AppShell, etc.) are
// excluded from the landing-page critical path.
const AppLayout = lazy(() =>
  import("@/components/layout/app-layout").then((m) => ({ default: m.AppLayout })),
);
const DemoLayout = lazy(() =>
  import("@/app/demo/layout").then((m) => ({ default: m.DemoLayout })),
);

// Authenticated pages — kept in separate chunks by Vite.
const DashboardPage = lazy(() =>
  import("@/app/dashboard/dashboard-page").then((m) => ({ default: m.DashboardPage })),
);
const ProjectsListPage = lazy(() =>
  import("@/app/projects/list-page").then((m) => ({ default: m.ProjectsListPage })),
);
const ProjectDetailPage = lazy(() =>
  import("@/app/projects/detail-page").then((m) => ({ default: m.ProjectDetailPage })),
);
const ProjectNewPage = lazy(() =>
  import("@/app/projects/new-page").then((m) => ({ default: m.ProjectNewPage })),
);
const ProjectEditPage = lazy(() =>
  import("@/app/projects/edit-page").then((m) => ({ default: m.ProjectEditPage })),
);
const SettingsPage = lazy(() =>
  import("@/app/settings/settings-page").then((m) => ({ default: m.SettingsPage })),
);
const DiagnosticsPage = lazy(() =>
  import("@/app/settings/diagnostics-page").then((m) => ({ default: m.DiagnosticsPage })),
);
const ExportPage = lazy(() =>
  import("@/app/export/export-page").then((m) => ({ default: m.ExportPage })),
);
const AboutPage = lazy(() =>
  import("@/app/about/about-page").then((m) => ({ default: m.AboutPage })),
);
const DemoDashboardPage = lazy(() =>
  import("@/app/demo/dashboard-page").then((m) => ({ default: m.DemoDashboardPage })),
);

// Minimal inline spinner shown while a lazy chunk is loading.
// Sized to fill the viewport so there is no layout shift on first navigation.
function PageLoader(): React.ReactElement {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: "/",
        element: <LandingPage />,
      },
      {
        path: "/auth/callback",
        element: <AuthCallbackPage />,
      },
      {
        element: (
          <Suspense fallback={<PageLoader />}>
            <AppLayout />
          </Suspense>
        ),
        children: [
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/projects", element: <ProjectsListPage /> },
          { path: "/projects/new", element: <ProjectNewPage /> },
          { path: "/projects/:id", element: <ProjectDetailPage /> },
          { path: "/projects/:id/edit", element: <ProjectEditPage /> },
          { path: "/settings", element: <SettingsPage /> },
          { path: "/settings/diagnostics", element: <DiagnosticsPage /> },
          { path: "/export", element: <ExportPage /> },
          { path: "/about", element: <AboutPage /> },
        ],
      },
      {
        element: (
          <Suspense fallback={<PageLoader />}>
            <DemoLayout />
          </Suspense>
        ),
        children: [
          { path: "/demo", element: <DemoDashboardPage /> },
          { path: "/demo/dashboard", element: <DemoDashboardPage /> },
          { path: "/demo/projects", element: <ProjectsListPage /> },
          { path: "/demo/projects/new", element: <ProjectNewPage /> },
          { path: "/demo/projects/:id", element: <ProjectDetailPage /> },
          { path: "/demo/projects/:id/edit", element: <ProjectEditPage /> },
          { path: "/demo/settings", element: <SettingsPage /> },
          { path: "/demo/export", element: <ExportPage /> },
          { path: "/demo/about", element: <AboutPage /> },
        ],
      },
    ],
  },
]);
