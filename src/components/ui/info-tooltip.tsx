import { type ReactElement, type ReactNode, useId, useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function InfoTooltip({ label, children, className }: InfoTooltipProps): ReactElement {
  const tooltipId = useId();
  const [open, setOpen] = useState(false);

  return (
    <span className={cn("group/info relative inline-flex align-middle", className)}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onClick={() => { setOpen((prev) => !prev); }}
        onBlur={() => { setOpen(false); }}
        className="inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Info className="size-3.5" aria-hidden="true" />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className={cn(
          "pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-md border bg-popover px-3 py-2 text-xs leading-relaxed text-popover-foreground shadow-md",
          "opacity-0 transition-opacity group-hover/info:opacity-100 group-focus-within/info:opacity-100",
          open && "opacity-100",
        )}
      >
        {children}
      </span>
    </span>
  );
}
