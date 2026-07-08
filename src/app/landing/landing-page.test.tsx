import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { axe } from "vitest-axe";
import { LandingPage } from "./landing-page";

// ---------- mocks ----------

const mockSignIn = vi.fn();
let mockStatus = "idle";
let mockIsAuthenticated = false;
let mockError: string | null = null;

vi.mock("@/services/auth-context", () => ({
  useAuth: (): {
    isAuthenticated: boolean;
    signIn: Mock;
    status: string;
    error: string | null;
  } => ({
    isAuthenticated: mockIsAuthenticated,
    signIn: mockSignIn,
    status: mockStatus,
    error: mockError,
  }),
}));

vi.mock("@/services/analytics", () => ({
  trackDemoCTAClicked: vi.fn(),
}));

function stubMdUpMatchMedia(matches: boolean): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: query === "(min-width: 768px)" ? matches : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

// ---------- helpers ----------

function renderLanding(path = "/"): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[path]}>
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
    mockError = null;
    mockSignIn.mockClear();
    stubMdUpMatchMedia(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it("shows session-expired message when needs_interaction and no error string", () => {
    // Arrange
    mockStatus = "needs_interaction";
    mockError = null;

    // Act
    renderLanding();

    // Assert
    expect(within(getMobileCard()).getByText(/session expired/i)).toBeInTheDocument();
  });

  it("shows auth.error string over the needs_interaction fallback", () => {
    // Arrange — auth.error set (e.g. from failWithTimeout)
    mockStatus = "unauthenticated";
    mockError = "Sign-in timed out. Google took too long to respond. Please check your connection and try again.";

    // Act
    renderLanding();

    // Assert
    expect(within(getMobileCard()).getByText(/sign-in timed out/i)).toBeInTheDocument();
  });

  it("shows no error banner when status is idle and error is null", () => {
    // Arrange
    mockStatus = "idle";
    mockError = null;

    // Act
    renderLanding();

    // Assert
    expect(within(getMobileCard()).queryByText(/session expired/i)).not.toBeInTheDocument();
    expect(within(getMobileCard()).queryByText(/timed out/i)).not.toBeInTheDocument();
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

  it("mobile footer uses text-zinc-600 for WCAG AA contrast (not zinc-500)", () => {
    // Arrange & Act
    renderLanding();

    // Assert — zinc-600 (#52525b) gives ~6.1:1 contrast on zinc-100 bg, passing AA
    const footer = within(getMobileFrame()).getByText(/not tax advice/i);
    expect(footer).toHaveClass("text-zinc-600");
    expect(footer).not.toHaveClass("text-zinc-500");
  });

  it("mobile layout contains a <main> landmark element", () => {
    // Arrange & Act
    const { container } = renderLanding();

    // Assert — screen readers use <main> to skip to page content
    const mobileFrame = getMobileFrame();
    const mainEl = mobileFrame.querySelector("main");
    expect(mainEl).toBeInTheDocument();
    expect(container.querySelector("main")).toBeInTheDocument();
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

  // ---------- signed-out banner ----------

  it("shows the signed-out banner when ?signed_out=1 is in the URL", () => {
    // Arrange & Act
    renderLanding("/?signed_out=1");

    // Assert
    const banner = screen.getAllByTestId("signed-out-banner")[0];
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent(/signed out successfully/i);
    expect(banner).toHaveTextContent(/your projects stay saved in your google drive/i);
  });

  it("does not show the signed-out banner on a normal landing visit", () => {
    // Arrange & Act
    renderLanding("/");

    // Assert
    expect(screen.queryByTestId("signed-out-banner")).not.toBeInTheDocument();
  });

  it("does not show the signed-out banner when signed_out param is not '1'", () => {
    // Arrange & Act
    renderLanding("/?signed_out=0");

    // Assert
    expect(screen.queryByTestId("signed-out-banner")).not.toBeInTheDocument();
  });
});

// ---------- accessibility ----------

describe("LandingPage accessibility", () => {
  beforeEach(() => {
    mockStatus = "idle";
    mockIsAuthenticated = false;
    mockError = null;
    stubMdUpMatchMedia(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("has no axe violations in the default unauthenticated state", async () => {
    // Arrange
    const { container } = renderLanding();

    // Act
    const results = await axe(container);

    // Assert
    expect(results.violations).toEqual([]);
  });

  it("has no axe violations while authenticating (loading state)", async () => {
    // Arrange
    mockStatus = "authenticating";
    const { container } = renderLanding();

    // Act
    const results = await axe(container);

    // Assert
    expect(results.violations).toEqual([]);
  });

  it("has no axe violations when showing the signed-out banner", async () => {
    // Arrange
    const { container } = renderLanding("/?signed_out=1");

    // Act
    const results = await axe(container);

    // Assert
    expect(results.violations).toEqual([]);
  });

  it("hides the desktop block from assistive technology on mobile viewports", () => {
    // Arrange
    stubMdUpMatchMedia(false);
    const { container } = renderLanding();

    // Assert
    const desktopBlock = container.querySelector(".md\\:flex");
    expect(desktopBlock).toHaveAttribute("aria-hidden", "true");
    expect(getMobileFrame()).not.toHaveAttribute("aria-hidden");
  });

  it("hides the mobile block from assistive technology on desktop viewports", () => {
    // Arrange
    stubMdUpMatchMedia(true);
    const { container } = renderLanding();

    // Assert
    expect(getMobileFrame()).toHaveAttribute("aria-hidden", "true");
    const desktopBlock = container.querySelector(".md\\:flex");
    expect(desktopBlock).not.toHaveAttribute("aria-hidden");
  });
});
