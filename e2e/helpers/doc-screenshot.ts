import path from "node:path";

/** Playwright options for documentation screenshots (≤200 kB target after compress). */
export const DOC_SCREENSHOT_OPTS = {
  type: "jpeg" as const,
  quality: 80,
  fullPage: false,
};

/** Resolve a `.jpg` path under a docs directory (preferred format for doc images). */
export function docScreenshotPath(dir: string, basename: string): string {
  const stem = basename.replace(/\.(png|jpe?g|webp)$/i, "");
  return path.join(dir, `${stem}.jpg`);
}
