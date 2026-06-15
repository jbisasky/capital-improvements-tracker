import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { LandingPage } from "./page";

// Mock the auth-context module
vi.mock("@/services/auth-context", () => ({
  useAuth: vi.fn(),
}));

// Mock analytics
vi.mock("@/services/analytics", () => ({
  trackDemoCTAClicked: vi.fn(),
}));

import { useAuth } from "@/services/auth-context";
import { type AuthStatus } from "@/services/auth";

interface MockAuthReturn {
  isAuthenticated: boolean;
  signIn: () => void;
  signOut: () => void;
  status: AuthStatus;
  error: string | null;
}

function mockAuth(overrides: Partial<MockAuthReturn> = {}): void {
  const defaults: MockAuthReturn = {
    isAuthenticated: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    status: "unauthenticated",
    error: null,
  };
  vi.mocked(useAuth).mockReturnValue({ ...defaults, ...overrides });
}

function renderLanding(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <LandingPage />
    </MemoryRouter>,
  );
}

describe("LandingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders hero heading and subheading", () => {
    // Arrange
    mockAuth();

    // Act
    renderLanding();

    // Assert
    expect(screen.getByRole("heading", { level: 1, name: /capital improvements/i })).toBeInTheDocument();
    expect(screen.getByText(/track home improvements.*their tax impact/i)).toBeInTheDocument();
  });

  it("renders 'Sign in with Google' button enabled when not loading", () => {
    // Arrange
    mockAuth({ status: "unauthenticated" });

    // Act
    renderLanding();

    // Assert
    const button = screen.getByRole("button", { name: /sign in with google/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it("renders 'See a demo' link", () => {
    // Arrange
    mockAuth();

    // Act
    renderLanding();

    // Assert
    expect(screen.getByRole("link", { name: /see a demo/i })).toBeInTheDocument();
  });

  it("renders all three feature bullet texts", () => {
    // Arrange
    mockAuth();

    // Act
    renderLanding();

    // Assert
    expect(screen.getByText(/your data stays in your google drive/i)).toBeInTheDocument();
    expect(screen.getByText(/no server ever sees your files or keys/i)).toBeInTheDocument();
    expect(screen.getByText(/bring your own gemini key for ai/i)).toBeInTheDocument();
  });

  it("shows 'Signing in…' and disables button when status is 'authenticating'", () => {
    // Arrange
    mockAuth({ status: "authenticating" });

    // Act
    renderLanding();

    // Assert
    const button = screen.getByRole("button", { name: /signing in/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it("shows session-expired message when status is 'needs_interaction'", () => {
    // Arrange
    mockAuth({ status: "needs_interaction" });

    // Act
    renderLanding();

    // Assert
    expect(screen.getByText(/session expired.*please sign in again/i)).toBeInTheDocument();
  });

  it("redirects to /dashboard when isAuthenticated is true", () => {
    // Arrange
    mockAuth({ isAuthenticated: true, status: "authenticated" });

    // Act
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <LandingPage />
      </MemoryRouter>,
    );

    // Assert — Navigate replaces, so the landing content should not render
    expect(container.querySelector("h1")).toBeNull();
  });
});
