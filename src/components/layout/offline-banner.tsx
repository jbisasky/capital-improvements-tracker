import { type ReactElement } from "react";
import { WifiOff } from "lucide-react";
import { OFFLINE_WRITE_MESSAGE } from "@/services/offline-error";
import { useOffline } from "@/services/offline-context";

export function OfflineBanner(): ReactElement | null {
  const { isOnline } = useOffline();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      data-testid="offline-banner"
      className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-950"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden />
      <span>{OFFLINE_WRITE_MESSAGE}</span>
    </div>
  );
}
