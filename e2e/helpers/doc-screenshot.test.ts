import { describe, it, expect } from "vitest";
import { docScreenshotPath, DOC_SCREENSHOT_OPTS } from "./doc-screenshot";

describe("docScreenshotPath", () => {
  it("normalizes png basename to jpg", () => {
    expect(docScreenshotPath("docs/screenshots", "dashboard.png")).toBe(
      "docs/screenshots/dashboard.jpg",
    );
  });

  it("leaves jpg basename unchanged", () => {
    expect(docScreenshotPath("docs/screenshots", "landing.jpg")).toBe(
      "docs/screenshots/landing.jpg",
    );
  });
});

describe("DOC_SCREENSHOT_OPTS", () => {
  it("uses jpeg capture defaults", () => {
    expect(DOC_SCREENSHOT_OPTS.type).toBe("jpeg");
    expect(DOC_SCREENSHOT_OPTS.quality).toBe(80);
    expect(DOC_SCREENSHOT_OPTS.fullPage).toBe(false);
  });
});
