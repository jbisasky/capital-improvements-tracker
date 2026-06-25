import { createBrowserRouter } from "react-router";
import { RootLayout } from "@/components/layout/root-layout";
import { AppLayout } from "@/components/layout/app-layout";
import { LandingPage } from "@/app/landing/page";
import { DashboardPage } from "@/app/dashboard/page";
import { ProjectsListPage } from "@/app/projects/list-page";
import { ProjectDetailPage } from "@/app/projects/detail-page";
import { ProjectNewPage } from "@/app/projects/new-page";
import { ProjectEditPage } from "@/app/projects/edit-page";
import { SettingsPage } from "@/app/settings/page";
import { DiagnosticsPage } from "@/app/settings/diagnostics-page";
import { ExportPage } from "@/app/export/page";
import { AboutPage } from "@/app/about/page";
import { DemoLayout } from "@/app/demo/layout";
import { DemoDashboardPage } from "@/app/demo/dashboard-page";
import { AuthCallbackPage } from "@/app/auth/callback-page";

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
        element: <AppLayout />,
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
        element: <DemoLayout />,
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
