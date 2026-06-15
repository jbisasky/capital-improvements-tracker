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
    vi.mocked(useLocation).mockReturnValue({ pathname: "/demo" } as unknown as ReturnType<typeof useLocation>);
    expect(useRoutePrefix()).toBe("/demo");

    vi.mocked(useLocation).mockReturnValue({ pathname: "/demo/some/path" } as unknown as ReturnType<typeof useLocation>);
    expect(useRoutePrefix()).toBe("/demo");
  });

  it("should return '' if pathname does not start with '/demo'", () => {
    vi.mocked(useLocation).mockReturnValue({ pathname: "/dashboard" } as unknown as ReturnType<typeof useLocation>);
    expect(useRoutePrefix()).toBe("");

    vi.mocked(useLocation).mockReturnValue({ pathname: "/" } as unknown as ReturnType<typeof useLocation>);
    expect(useRoutePrefix()).toBe("");

    vi.mocked(useLocation).mockReturnValue({ pathname: "/about" } as unknown as ReturnType<typeof useLocation>);
    expect(useRoutePrefix()).toBe("");
  });
});
