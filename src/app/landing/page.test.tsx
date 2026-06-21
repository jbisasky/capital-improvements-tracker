import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, within } from "@testing-library/react";
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

function getMobileFrame(): HTMLElement {
  return screen.getByTestId("landing-mobile-frame");
}

function getMobileHero(): HTMLElement {
  return screen.getByTestId("landing-mobile-hero");
}

function getMobileCard(): HTMLElement {
  return screen.getByTestId("landing-mobile-card");
}

// ---------- tests ----------

describe("LandingPage", () => {
  beforeEach(() => {
    mockStatus = "idle";
    mockIsAuthenticated = false;
    mockSignIn.mockClear();
  });

  it("renders hero heading and subheading inside the dark hero block", () => {
    // Arrange & Act
    renderLanding();

    // Assert
    const hero = getMobileHero();
    expect(
      within(hero).getByRole("heading", {
        level: 1,
        name: /capital improvements/i,
      }),
    ).toBeInTheDocument();
    expect(within(hero).getByText(/track home improvements/i)).toBeInTheDocument();
  });

  it('renders "Sign in with Google" button enabled when not loading', () => {
    // Arrange & Act
    renderLanding();

    // Assert
    const btn = within(getMobileCard()).getByRole("button", {
      name: /sign in with google/i,
    });
    expect(btn).toBeInTheDocument();
    expect(btn).toBeEnabled();
  });

  it('renders "See a demo" link pointing to /demo', () => {
    // Arrange & Act
    renderLanding();

    // Assert
    const link = within(getMobileCard()).getByRole("link", { name: /see a demo/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/demo");
  });

  it("renders all three feature bullet points inside the floating card", () => {
    // Arrange & Act
    renderLanding();

    // Assert
    const list = document.getElementById("feature-list");
    expect(list).toBeInTheDocument();
    if (!list) {
      throw new Error("feature-list not found");
    }
    expect(within(list).getByText("Your data stays")).toBeInTheDocument();
    expect(within(list).getByText(/in YOUR Google Drive/i)).toBeInTheDocument();
    expect(within(list).getByText("No server")).toBeInTheDocument();
    expect(within(list).getByText(/ever sees your files or keys/i)).toBeInTheDocument();
    expect(within(list).getByText("Bring your own")).toBeInTheDocument();
    expect(within(list).getByText(/gemini key for ai/i)).toBeInTheDocument();
  });

  it('shows "Signing in…" and disables button when authenticating', () => {
    // Arrange
    mockStatus = "authenticating";

    // Act
    renderLanding();

    // Assert
    const btn = within(getMobileCard()).getByRole("button", { name: /signing in/i });
    expect(btn).toBeDisabled();
  });

  it("shows session-expired message when needs_interaction", () => {
    // Arrange
    mockStatus = "needs_interaction";

    // Act
    renderLanding();

    // Assert
    expect(within(getMobileCard()).getByText(/session expired/i)).toBeInTheDocument();
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

  it("does not use masked backdrop layers over hero copy", () => {
    // Arrange & Act
    const { container } = renderLanding();

    // Assert
    expect(container.innerHTML).not.toMatch(/mask-image/);
  });

  it("renders the mobile frame as a full-screen column with canvas background", () => {
    // Arrange & Act
    renderLanding();

    // Assert — full-screen, no padding, no mock phone-frame rounding
    const frame = getMobileFrame();
    expect(frame).toHaveClass("min-h-screen");
    expect(frame).toHaveClass("flex-col");
    expect(frame).toHaveClass("bg-[#f4f6f7]");
    expect(frame).not.toHaveClass("px-4");
    expect(frame).not.toHaveClass("py-6");
    expect(frame).not.toHaveClass("rounded-[2rem]");
  });

  it("renders the dark hero block with correct background and rounded bottom", () => {
    // Arrange & Act
    renderLanding();

    // Assert
    const hero = getMobileHero();
    expect(hero).toHaveClass("bg-[#11262c]");
    expect(hero).toHaveClass("rounded-b-[2rem]");
    expect(hero).toHaveClass("shadow-md");
  });

  it("renders H1 and description in white/slate tones inside the dark hero", () => {
    // Arrange & Act
    renderLanding();

    // Assert
    const hero = getMobileHero();
    const h1 = within(hero).getByRole("heading", {
      level: 1,
      name: /capital improvements/i,
    });
    expect(h1).toHaveClass("text-white");
    expect(h1).toHaveClass("text-3xl");
    expect(h1).toHaveClass("font-black");

    const desc = within(hero).getByText(/track home improvements/i);
    expect(desc).toHaveClass("text-slate-300/90");
    expect(desc).toHaveClass("text-sm");
  });

  it("places floating interaction card below hero with overlap classes", () => {
    // Arrange & Act
    renderLanding();

    // Assert
    const card = getMobileCard();
    expect(card).toHaveClass("-mt-6");
    expect(card).toHaveClass("relative");
    expect(card).toHaveClass("z-10");
    expect(card).toHaveClass("rounded-2xl");
    expect(card).toHaveClass("bg-white");
    expect(card).toHaveClass("border-zinc-200/80");
    expect(card).toHaveClass("shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)]");
  });

  it("H1 is inside the dark hero, not the floating card", () => {
    // Arrange & Act
    renderLanding();

    // Assert
    const card = getMobileCard();
    expect(
      within(card).queryByRole("heading", { level: 1, name: /capital improvements/i }),
    ).not.toBeInTheDocument();
  });

  it("uses font-black heading and feature list with teal-tinted icon tiles", () => {
    // Arrange & Act
    renderLanding();

    // Assert
    expect(
      within(getMobileHero()).getByRole("heading", {
        level: 1,
        name: /capital improvements/i,
      }),
    ).toHaveClass("font-black");
    const featureList = document.getElementById("feature-list");
    expect(featureList).toHaveClass("leading-relaxed");
    expect(featureList?.querySelector(".rounded-xl.bg-teal-50\\/80")).toBeInTheDocument();
  });

  it("applies base-size typography to feature row text, vertically centred with icons", () => {
    // Arrange & Act
    renderLanding();

    // Assert — outer span has text-base; lead phrases are bold zinc-900;
    // rest text relaxes to zinc-500; rows are items-center
    const list = document.getElementById("feature-list");
    const spans = list?.querySelectorAll("li > span");
    expect(spans?.length).toBeGreaterThan(0);
    if (spans) {
      for (const span of spans) {
        expect(span).toHaveClass("text-base");
        expect(span).not.toHaveClass("pt-0.5");
      }
    }
    // Lead phrases: font-semibold text-zinc-900
    const leads = list?.querySelectorAll("li > span > strong");
    if (leads) {
      for (const lead of leads) {
        expect(lead).toHaveClass("font-semibold");
        expect(lead).toHaveClass("text-zinc-900");
      }
    }
    // Rest text: relaxed zinc-500
    const rests = list?.querySelectorAll("li > span > span");
    if (rests) {
      for (const rest of rests) {
        expect(rest).toHaveClass("text-zinc-500");
      }
    }
    const rows = list?.querySelectorAll("li");
    if (rows) {
      for (const row of rows) {
        expect(row).toHaveClass("items-center");
      }
    }
  });

  it("styles the Google sign-in button with brand dark fill on mobile", () => {
    // Arrange & Act
    renderLanding();

    // Assert
    const btn = within(getMobileCard()).getByRole("button", {
      name: /sign in with google/i,
    });
    expect(btn).toHaveClass("font-semibold");
    expect(btn).toHaveClass("bg-[#11262c]");
    expect(btn).toHaveClass("shadow-sm");
    expect(btn).toHaveClass("px-4");
  });

  it("styles the demo CTA as a transparent bordered secondary button on mobile", () => {
    // Arrange & Act
    renderLanding();

    // Assert
    const link = within(getMobileCard()).getByRole("link", { name: /see a demo/i });
    expect(link).toHaveClass("bg-transparent");
    expect(link).toHaveClass("border-zinc-200");
    expect(link).toHaveClass("hover:bg-zinc-50");
  });

  it("renders bold anchor phrases in feature bullets", () => {
    // Arrange & Act
    renderLanding();

    // Assert
    const list = document.getElementById("feature-list");
    expect(list).toBeInTheDocument();
    if (!list) {
      throw new Error("feature-list not found");
    }
    expect(within(list).getByText("Your data stays")).toHaveClass("font-semibold");
    expect(within(list).getByText("No server")).toHaveClass("font-semibold");
    expect(within(list).getByText("Bring your own")).toHaveClass("font-semibold");
  });

  it("renders uppercase disclaimer footer inside the mobile frame", () => {
    // Arrange & Act
    renderLanding();

    // Assert
    const footer = within(getMobileFrame()).getByText(/not tax advice/i);
    expect(footer).toHaveClass("uppercase");
    expect(footer).toHaveClass("text-[10px]");
    expect(footer).toHaveClass("font-bold");
    expect(footer).toHaveClass("tracking-wider");
  });

  it("includes desktop layered markup in the DOM", () => {
    // Arrange & Act
    const { container } = renderLanding();

    // Assert — desktop block hidden in jsdom but present for md+ viewports
    expect(container.querySelector(".md\\:flex")).toBeInTheDocument();
    // Dashboard watermark present in absolute layer
    expect(container.querySelector("[data-testid='landing-dashboard-preview']")).toBeInTheDocument();
    // Gradient shield between watermark and text
    expect(container.querySelector(".bg-gradient-to-r")).toBeInTheDocument();
    // Hero text at z-20 above the gradient
    expect(container.querySelector(".z-20")).toBeInTheDocument();
  });
});
