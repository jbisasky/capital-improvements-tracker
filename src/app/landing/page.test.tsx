import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { LandingPage } from "./page";

// ---------- mocks ----------

const mockSignIn = vi.fn();
let mockStatus = "idle";
let mockIsAuthenticated = false;

vi.mock("@/services/auth-context", () => ({
  useAuth: (): {
    isAuthenticated: boolean;
    signIn: Mock;
    status: string;
  } => ({
    isAuthenticated: mockIsAuthenticated,
    signIn: mockSignIn,
    status: mockStatus,
  }),
}));

vi.mock("@/services/analytics", () => ({
  trackDemoCTAClicked: vi.fn(),
}));

// ---------- helpers ----------

function renderLanding(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <LandingPage />
    </MemoryRouter>,
  );
}

// ---------- tests ----------

describe("LandingPage", () => {
  beforeEach(() => {
    mockStatus = "idle";
    mockIsAuthenticated = false;
    mockSignIn.mockClear();
  });

  it("renders hero heading and subheading", () => {
    // Arrange & Act
    renderLanding();

    // Assert
    expect(
      screen.getByRole("heading", { level: 1, name: /capital improvements/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/track home improvements/i),
    ).toBeInTheDocument();
  });

  it('renders "Sign in with Google" button enabled when not loading', () => {
    // Arrange & Act
    renderLanding();

    // Assert
    const btn = screen.getByRole("button", { name: /sign in with google/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toBeEnabled();
  });

  it('renders "See a demo" link pointing to /demo', () => {
    // Arrange & Act
    renderLanding();

    // Assert
    const link = screen.getByRole("link", { name: /see a demo/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/demo");
  });

  it("renders all three feature bullet points", () => {
    // Arrange & Act
    renderLanding();

    // Assert
    expect(screen.getByText(/your data stays in your google drive/i)).toBeInTheDocument();
    expect(screen.getByText(/no server ever sees your files or keys/i)).toBeInTheDocument();
    expect(screen.getByText(/bring your own gemini key for ai/i)).toBeInTheDocument();
  });

  it('shows "Signing in…" and disables button when authenticating', () => {
    // Arrange
    mockStatus = "authenticating";

    // Act
    renderLanding();

    // Assert
    const btn = screen.getByRole("button", { name: /signing in/i });
    expect(btn).toBeDisabled();
  });

  it("shows session-expired message when needs_interaction", () => {
    // Arrange
    mockStatus = "needs_interaction";

    // Act
    renderLanding();

    // Assert
    expect(screen.getByText(/session expired/i)).toBeInTheDocument();
  });

  it("redirects to /dashboard when isAuthenticated is true", () => {
    // Arrange
    mockIsAuthenticated = true;

    // Act
    renderLanding();

    // Assert — Navigate renders nothing visible; the heading should not be present
    expect(
      screen.queryByRole("heading", { level: 1, name: /capital improvements/i }),
    ).not.toBeInTheDocument();
  });
});
