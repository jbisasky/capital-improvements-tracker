import { describe, it, expect } from "vitest";
import { projectFolderDisplayName, sanitizeDriveFolderName } from "./drive-folder-name";

describe("drive-folder-name", () => {
  it("sanitizes invalid Drive characters", () => {
    expect(sanitizeDriveFolderName('Roof / "ABC"')).toBe("Roof - -ABC-");
  });

  it("builds folder name from title and date", () => {
    expect(
      projectFolderDisplayName({
        title: "New roof",
        completionDate: "2025-04-12",
        id: "123e4567-e89b-12d3-a456-426614174000",
      }),
    ).toBe("New roof - 2025-04-12");
  });

  it("falls back to project id when title is empty after sanitize", () => {
    expect(
      projectFolderDisplayName({
        title: "   ",
        completionDate: "2025-04-12",
        id: "123e4567-e89b-12d3-a456-426614174000",
      }),
    ).toBe("Project 123e4567");
  });
});
