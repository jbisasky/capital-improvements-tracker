import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("should merge basic tailwind classes", () => {
    expect(cn("bg-red-500", "text-white")).toBe("bg-red-500 text-white");
  });

  it("should merge conditional classes", () => {
    const isTrue = true as boolean;
    const isFalse = false as boolean;
    expect(cn("bg-red-500", isTrue ? "text-white" : "", isFalse ? "font-bold" : "")).toBe(
      "bg-red-500 text-white",
    );
  });

  it("should override conflicting tailwind classes correctly", () => {
    expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
  });

  it("should handle arrays and objects", () => {
    expect(cn(["bg-red-500", "text-white"], { "font-bold": true })).toBe(
      "bg-red-500 text-white font-bold",
    );
  });

  it("should remove extra spaces and falsy values", () => {
    expect(cn("bg-red-500", "", undefined, null, "  ", "text-white")).toBe(
      "bg-red-500 text-white",
    );
  });
});
