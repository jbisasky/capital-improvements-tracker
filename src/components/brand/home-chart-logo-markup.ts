/** Matches `--primary` in light mode ([`src/index.css`](../index.css)). */
export const BRAND_PRIMARY = "oklch(0.28 0.04 200)";

export const HOME_CHART_LOGO_VIEWBOX = "0 0 100 100";

/** Scale house 15% and center its visual mass in the circle (chimney-aware). */
export const HOME_CHART_HOUSE_TRANSFORM =
  "translate(1.2 -4.8) translate(50 51) scale(1.15) translate(-50 -51)";

export const HOME_CHART_HOUSE_PATH =
  "M26 74.5V49.5L50 31.5 74 49.5V74.5c0 1.4-1.1 2.5-2.5 2.5h-43c-1.4 0-2.5-1.1-2.5-2.5Z";

export const HOME_CHART_CHIMNEY_PATH =
  "M63 49.5V36.5c0-1.1.9-2 2-2h5c1.1 0 2 .9 2 2v13h-9Z";

export const HOME_CHART_BARS = [
  { x: 36, y: 58, width: 8, height: 14 },
  { x: 46, y: 52, width: 8, height: 20 },
  { x: 56, y: 46, width: 8, height: 26 },
] as const;
