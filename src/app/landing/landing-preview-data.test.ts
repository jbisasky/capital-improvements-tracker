import { describe, it, expect } from "vitest";
import { getLandingPreviewData } from "./landing-preview-data";

describe("getLandingPreviewData", () => {
  it("derives stats from demo fixture data", () => {
    const data = getLandingPreviewData();

    expect(data.costBasisAdded).toBe(47500);
    expect(data.projectCount).toBe(8);
    expect(data.totalSpent).toBe(82250);
    expect(data.recentProjects[0]?.title).toBe("Fence Installation");
  });
});
