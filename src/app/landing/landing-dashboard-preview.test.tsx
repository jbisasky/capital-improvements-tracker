import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LandingDashboardPreview } from "./landing-dashboard-preview";

describe("LandingDashboardPreview", () => {
  it("renders dashboard summary and a fixture project", () => {
    render(<LandingDashboardPreview />);

    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Cost Basis Added")).toBeInTheDocument();
    expect(screen.getByText("Fence Installation")).toBeInTheDocument();
  });
});
