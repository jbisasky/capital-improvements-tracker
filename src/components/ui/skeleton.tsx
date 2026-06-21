import { cn } from "@/lib/utils";

/**
 * Base skeleton block — a pulsing muted rectangle used to represent
 * loading content. Respects `prefers-reduced-motion` (pulse disabled).
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-200/80 motion-reduce:animate-none", className)}
      {...props}
    />
  );
}
