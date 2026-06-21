import { type ReactElement } from "react";
import { Link, Outlet } from "react-router";
import { AppShell } from "@/components/layout/app-shell";
import { StorageProvider } from "@/services/storage-context";
import { MockStorageDriver } from "@/services/mock-storage-driver";

const demoDriver = new MockStorageDriver();

export function DemoLayout(): ReactElement {
  return (
    <StorageProvider driver={demoDriver}>
      <div className="fixed top-0 right-0 left-0 z-50 flex flex-row items-center justify-center bg-amber-500 px-4 py-2 text-xs font-medium text-white min-h-[36px]">
        Viewing read-only demo data.
        <Link
          to="/"
          className="ml-1 inline underline hover:text-amber-100 md:hidden"
        >
          Exit Demo
        </Link>
        <Link
          to="/"
          className="ml-3 hidden rounded bg-white/20 px-2 py-0.5 font-semibold text-white shadow-sm transition-colors hover:bg-white/30 md:inline-block"
        >
          Exit Demo &amp; Connect Drive
        </Link>
      </div>
      <div className="pt-[36px]">
        <AppShell>
          <Outlet />
        </AppShell>
      </div>
    </StorageProvider>
  );
}
