import { type ReactElement } from "react";
import { cn } from "@/lib/utils";
import {
  HOME_CHART_BARS,
  HOME_CHART_CHIMNEY_PATH,
  HOME_CHART_HOUSE_PATH,
  HOME_CHART_HOUSE_TRANSFORM,
  HOME_CHART_LOGO_VIEWBOX,
} from "@/components/brand/home-chart-logo-markup";

interface HomeChartLogoProps {
  className?: string;
  /** Use when visible text already names the app (header, sidebar). */
  decorative?: boolean;
  /** Omit the outer circle — for use on solid brand-color containers. */
  markOnly?: boolean;
}

/**
 * House + growth bars mark. Circle/bars use currentColor (e.g. text-primary).
 */
export function HomeChartLogo({
  className,
  decorative = false,
  markOnly = false,
}: HomeChartLogoProps): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={HOME_CHART_LOGO_VIEWBOX}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : "Capital improvements"}
      className={cn("shrink-0", className)}
    >
      {!markOnly && <circle cx="50" cy="50" r="48" fill="currentColor" />}
      <g transform={HOME_CHART_HOUSE_TRANSFORM}>
        <path fill="#fff" d={HOME_CHART_HOUSE_PATH} />
        <path fill="#fff" d={HOME_CHART_CHIMNEY_PATH} />
        {HOME_CHART_BARS.map((bar) => (
          <rect
            key={`${String(bar.x)}-${String(bar.y)}`}
            x={bar.x}
            y={bar.y}
            width={bar.width}
            height={bar.height}
            rx="2"
            fill="currentColor"
          />
        ))}
      </g>
    </svg>
  );
}
