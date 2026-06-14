import { describe, it, expect, vi } from "vitest";
import { useRoutePrefix } from "./use-route-prefix";

// Mock the react-router module
vi.mock("react-router", () => ({
  useLocation: vi.fn(),
}));

import { useLocation } from "react-router";

describe("useRoutePrefix", () => {
  it("should return '/demo' if pathname starts with '/demo'", () => {
    // Setup mock return value
    (useLocation as any).mockReturnValue({ pathname: "/demo" });
    expect(useRoutePrefix()).toBe("/demo");

    (useLocation as any).mockReturnValue({ pathname: "/demo/some/path" });
    expect(useRoutePrefix()).toBe("/demo");
  });

  it("should return '' if pathname does not start with '/demo'", () => {
    (useLocation as any).mockReturnValue({ pathname: "/dashboard" });
    expect(useRoutePrefix()).toBe("");

    (useLocation as any).mockReturnValue({ pathname: "/" });
    expect(useRoutePrefix()).toBe("");

    (useLocation as any).mockReturnValue({ pathname: "/about" });
    expect(useRoutePrefix()).toBe("");
  });
});
