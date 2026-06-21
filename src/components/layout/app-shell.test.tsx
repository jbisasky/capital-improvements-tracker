import { describe, it, expect, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AppShell } from "./app-shell";

// ---------- mocks ----------

const mockSignOut = vi.fn();

vi.mock("@/services/auth-context", () => ({
  useAuth: () => ({ signOut: mockSignOut }),
}));

vi.mock("@/components/brand/home-chart-logo", () => ({
  HomeChartLogo: () => <svg data-testid="logo" />,
}));

// ---------- helpers ----------

function renderShell(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AppShell>
        <div data-testid="children" />
      </AppShell>
    </MemoryRouter>,
  );
}

function getMobileTopBar() {
  return screen.getByTestId("mobile-top-bar");
}

// ---------- live mode ----------

describe("AppShell live mode", () => {
  it("renders the mobile top bar", () => {
    renderShell("/dashboard");
    expect(getMobileTopBar()).toBeInTheDocument();
  });

  it("mobile top bar shows 'Sign out' button on non-projects pages", () => {
    // Arrange + Act
    renderShell("/dashboard");

    // Assert
    expect(
      within(getMobileTopBar()).getByRole("button", { name: /sign out/i }),
    ).toBeInTheDocument();
  });

  it("mobile top bar shows 'Sign out' button on projects pages", () => {
    // Arrange + Act
    renderShell("/projects");

    // Assert
    expect(
      within(getMobileTopBar()).getByRole("button", { name: /sign out/i }),
    ).toBeInTheDocument();
  });

  it("mobile top bar shows 'Sign out' button on project detail pages", () => {
    // Arrange + Act
    renderShell("/projects/abc-123");

    // Assert
    expect(
      within(getMobileTopBar()).getByRole("button", { name: /sign out/i }),
    ).toBeInTheDocument();
  });

  it("mobile top bar 'Sign out' calls auth.signOut", () => {
    // Arrange
    renderShell("/dashboard");

    // Act
    fireEvent.click(
      within(getMobileTopBar()).getByRole("button", { name: /sign out/i }),
    );

    // Assert
    expect(mockSignOut).toHaveBeenCalledOnce();
  });

  it("does not render any 'Exit Demo' link", () => {
    // Arrange + Act
    renderShell("/dashboard");

    // Assert
    expect(screen.queryByRole("link", { name: /exit demo/i })).not.toBeInTheDocument();
  });

  it("renders all 5 standard nav items", () => {
    // Arrange + Act
    renderShell("/dashboard");

    // Assert
    expect(screen.getAllByText("Dashboard").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Projects").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Export").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Settings").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("About").length).toBeGreaterThanOrEqual(1);
  });

  it("mobile top bar shows app brand", () => {
    // Arrange + Act
    renderShell("/dashboard");

    // Assert
    expect(within(getMobileTopBar()).getByText("Capital Tracker")).toBeInTheDocument();
  });
});

// ---------- demo mode ----------

describe("AppShell demo mode", () => {
  it("mobile top bar shows 'Exit Demo' link pointing to / on non-projects pages", () => {
    // Arrange + Act
    renderShell("/demo/dashboard");

    // Assert
    const link = within(getMobileTopBar()).getByRole("link", { name: /exit demo/i });
    expect(link).toHaveAttribute("href", "/");
  });

  it("mobile top bar shows 'Exit Demo' link pointing to / on projects pages", () => {
    // Arrange + Act
    renderShell("/demo/projects");

    // Assert
    const link = within(getMobileTopBar()).getByRole("link", { name: /exit demo/i });
    expect(link).toHaveAttribute("href", "/");
  });

  it("does not render a 'Sign out' button anywhere", () => {
    // Arrange + Act
    renderShell("/demo/dashboard");

    // Assert
    expect(screen.queryByRole("button", { name: /sign out/i })).not.toBeInTheDocument();
  });

  it("desktop sidebar also shows 'Exit Demo' link pointing to /", () => {
    // Arrange + Act
    renderShell("/demo/dashboard");

    // Assert — sidebar + mobile top bar
    const links = screen.getAllByRole("link", { name: /exit demo/i });
    expect(links.length).toBeGreaterThanOrEqual(2);
    links.forEach((l) => expect(l).toHaveAttribute("href", "/"));
  });

  it("nav links are prefixed with /demo", () => {
    // Arrange + Act
    renderShell("/demo/dashboard");

    // Assert
    const demoDashboardLinks = screen
      .getAllByRole("link")
      .filter((el) => el.getAttribute("href") === "/demo/dashboard");
    expect(demoDashboardLinks.length).toBeGreaterThan(0);
  });
});

// ---------- mobile tab bar ----------

describe("AppShell mobile tab bar", () => {
  it("never shows Exit Demo in the tab bar", () => {
    // Arrange + Act
    renderShell("/demo/dashboard");
    const nav = document.querySelector("nav");

    // Assert
    expect(within(nav!).queryByText("Exit Demo")).not.toBeInTheDocument();
  });

  it("tab bar has exactly 5 standard items in live mode", () => {
    // Arrange + Act
    renderShell("/dashboard");
    const nav = document.querySelector("nav");
    const items = within(nav!).getAllByRole("link");

    // Assert
    expect(items).toHaveLength(5);
  });

  it("tab bar has exactly 5 standard items in demo mode", () => {
    // Arrange + Act
    renderShell("/demo/dashboard");
    const nav = document.querySelector("nav");
    const items = within(nav!).getAllByRole("link");

    // Assert
    expect(items).toHaveLength(5);
  });
});
