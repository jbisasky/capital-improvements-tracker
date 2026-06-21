import type * as ReactRouter from "react-router";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { DemoLayout } from "./layout";

// ---------- mocks ----------

vi.mock("@/services/storage-context", () => ({
  StorageProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("@/components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-shell">{children}</div>
  ),
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>();
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet" />,
  };
});

// ---------- helpers ----------

function renderLayout(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <DemoLayout />
    </MemoryRouter>,
  );
}

// ---------- tests ----------

describe("DemoLayout banner", () => {
  it("renders the banner message", () => {
    // Arrange + Act
    renderLayout();

    // Assert
    expect(screen.getByText(/Viewing read-only demo data\./)).toBeInTheDocument();
  });

  it("renders the mobile inline link with correct text and href", () => {
    // Arrange + Act
    renderLayout();

    // Assert — find the link with md:hidden class
    const links = screen.getAllByRole("link", { name: /Exit Demo/ });
    const mobileLink = links.find((el) =>
      el.classList.contains("md:hidden"),
    );
    expect(mobileLink).toBeDefined();
    expect(mobileLink).toHaveAttribute("href", "/");
    expect(mobileLink).toHaveClass("underline");
    expect(mobileLink).toHaveClass("inline");
  });

  it("renders the desktop micro-button with correct text and href", () => {
    // Arrange + Act
    renderLayout();

    // Assert
    const desktopLink = screen.getByRole("link", {
      name: "Exit Demo & Connect Drive",
    });
    expect(desktopLink).toHaveAttribute("href", "/");
    expect(desktopLink).toHaveClass("hidden");
    expect(desktopLink).toHaveClass("md:inline-block");
    expect(desktopLink).toHaveClass("bg-white/20");
  });

  it("mobile link is visually hidden on md+ via md:hidden class", () => {
    // Arrange + Act
    renderLayout();

    // Assert
    const links = screen.getAllByRole("link", { name: /Exit Demo/ });
    const mobileLink = links.find((el) => el.classList.contains("md:hidden"));
    expect(mobileLink).toHaveClass("md:hidden");
  });

  it("desktop button is hidden below md via hidden class", () => {
    // Arrange + Act
    renderLayout();

    // Assert
    const desktopLink = screen.getByRole("link", {
      name: "Exit Demo & Connect Drive",
    });
    expect(desktopLink).toHaveClass("hidden");
  });

  it("content area has pt-[36px] to clear the fixed banner", () => {
    // Arrange + Act
    const { container } = renderLayout();

    // Assert
    const spacer = container.querySelector(".pt-\\[36px\\]");
    expect(spacer).toBeInTheDocument();
  });

  it("banner wrapper has min-h-[36px] and amber background", () => {
    // Arrange + Act
    const { container } = renderLayout();

    // Assert
    const banner = container.querySelector(".bg-amber-500");
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveClass("min-h-[36px]");
    expect(banner).toHaveClass("fixed");
  });

  it("renders the AppShell and Outlet", () => {
    // Arrange + Act
    renderLayout();

    // Assert
    expect(screen.getByTestId("app-shell")).toBeInTheDocument();
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
  });
});
