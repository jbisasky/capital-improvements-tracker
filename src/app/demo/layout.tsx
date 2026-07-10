import { type ReactElement, Suspense } from "react";
import { Link, Outlet } from "react-router";
import { AppShell } from "@/components/layout/app-shell";
import { PageContentLoader } from "@/components/layout/page-content-loader";
import { StorageProvider } from "@/services/storage-context";
import { MockStorageDriver } from "@/services/mock-storage-driver";

const demoDriver = new MockStorageDriver();

export function DemoLayout(): ReactElement {
  return (
    <StorageProvider driver={demoDriver} persistOfflineCache={false}>
      <div role="banner" className="fixed top-0 right-0 left-0 z-50 flex flex-row items-center justify-center bg-amber-700 px-4 py-2 text-xs font-medium text-white min-h-[36px]">
        Viewing read-only demo data.
        <Link
          to="/"
          className="ml-1 inline underline hover:text-amber-100 md:hidden"
        >
          Exit Demo
        </Link>
        <Link
          to="/"
          className="ml-3 hidden rounded bg-amber-900 px-2 py-0.5 font-semibold text-white shadow-sm transition-colors hover:bg-amber-950 md:inline-block"
        >
          Exit Demo &amp; Connect Drive
        </Link>
      </div>
      <div className="h-screen pt-[36px]">
        <AppShell>
          <Suspense fallback={<PageContentLoader />}>
            <Outlet />
          </Suspense>
        </AppShell>
      </div>
    </StorageProvider>
  );
}
