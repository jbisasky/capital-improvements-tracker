import { type ReactElement } from "react";
import { Button } from "@/components/ui/button";

interface UpdateAvailableBannerProps {
  onRefresh: () => void;
}

export function UpdateAvailableBanner({
  onRefresh,
}: UpdateAvailableBannerProps): ReactElement {
  return (
    <div
      role="status"
      data-testid="update-available-banner"
      className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/20 bg-primary/5 px-4 py-2 text-sm text-foreground"
    >
      <span>Update available — refresh to get the latest version.</span>
      <Button type="button" size="sm" variant="outline" onClick={onRefresh}>
        Refresh
      </Button>
    </div>
  );
}
