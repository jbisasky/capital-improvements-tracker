import { describe, it, expect } from "vitest";
import { FORM_SELECT, FORM_TEXT } from "./form-field-classes";

describe("form-field-classes", () => {
  it("includes hover styles for text inputs", () => {
    expect(FORM_TEXT).toContain("hover:bg-accent/50");
  });

  it("includes pointer cursor and hover styles for selects", () => {
    expect(FORM_SELECT).toContain("cursor-pointer");
    expect(FORM_SELECT).toContain("hover:bg-accent");
  });
});
