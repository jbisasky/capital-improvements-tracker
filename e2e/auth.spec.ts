import { test, expect } from "./fixtures/index";
import { test as pwTest } from "@playwright/test";
import { seedAuthToken, seedExpiredToken, seedPkceState } from "./fixtures/auth-state";
import { setupMockDrive } from "./fixtures/mock-drive";
import AxeBuilder from "@axe-core/playwright";

// ---------------------------------------------------------------------------
// A1 — Sign-in redirects to Google
// ---------------------------------------------------------------------------

pwTest.describe("A1 — Sign-in redirects to Google", () => {
  pwTest(
    "desktop: clicking Sign in triggers navigation to accounts.google.com",
    async ({ page }) => {
      // Arrange — block the Google navigation so the browser doesn't actually leave
      let capturedUrl = "";
      await page.route("**/accounts.google.com/**", async (route) => {
        capturedUrl = route.request().url();
        await route.abort();
      });

      // Default desktop viewport: only the non-aria-hidden layout is exposed to getByRole
      // (on mobile the desktop tree is aria-hidden; on desktop the mobile tree is aria-hidden)
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto("/");

      // Act — click sign-in, then wait for the async PKCE challenge computation
      // and subsequent window.location.href assignment (up to 5 s)
      await page.getByRole("button", { name: /sign in with google/i }).click();
      await page.waitForTimeout(3000);

      // Assert
      expect(capturedUrl).toContain("accounts.google.com");
      expect(capturedUrl).toContain("response_type=code");
      expect(capturedUrl).toContain("scope=");
    },
  );

  pwTest(
    "mobile: clicking Sign in triggers navigation to accounts.google.com",
    async ({ page }) => {
      // Arrange — block the Google navigation so the browser doesn't actually leave
      let capturedUrl = "";
      await page.route("**/accounts.google.com/**", async (route) => {
        capturedUrl = route.request().url();
        await route.abort();
      });

      // Mobile: desktop tree is aria-hidden; scope to the visible mobile card
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/");

      await page
        .getByTestId("landing-mobile-card")
        .getByRole("button", { name: /sign in with google/i })
        .click();
      await page.waitForTimeout(3000);

      expect(capturedUrl).toContain("accounts.google.com");
      expect(capturedUrl).toContain("response_type=code");
      expect(capturedUrl).toContain("scope=");
    },
  );
});

// ---------------------------------------------------------------------------
// A2 — Auth guard: unauthenticated user is redirected to /
// ---------------------------------------------------------------------------

pwTest.describe("A2 — Auth guard redirects unauthenticated users", () => {
  pwTest("desktop: navigating to /dashboard without a token redirects to /", async ({ page }) => {
    // No token seeded — sessionStorage is empty
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/dashboard");

    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("button", { name: /sign in with google/i }),
    ).toBeVisible();
  });

  pwTest("mobile: navigating to /dashboard without a token redirects to /", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard");

    await expect(page).toHaveURL("/");
    await expect(
      page.getByTestId("landing-mobile-card").getByRole("button", { name: /sign in with google/i }),
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// A3 — Auth guard: authenticated user lands on dashboard
// ---------------------------------------------------------------------------

test.describe("A3 — Authenticated user reaches dashboard", () => {
  test("dashboard renders after token is seeded", async ({ authedPage }) => {
    // authedPage fixture navigates to /dashboard with token + Drive mocked
    await expect(authedPage).toHaveURL(/\/dashboard/);
    // The app shell sidebar should be visible (contains nav links)
    await expect(authedPage.getByRole("link", { name: /dashboard/i }).first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// A4 — Sign-out clears session and returns to /?signed_out=1
// ---------------------------------------------------------------------------

test.describe("A4 — Sign-out flow", () => {
  test("sign-out button navigates to /?signed_out=1 and shows banner", async ({ authedPage }) => {
    // Sidebar sign-out button
    await authedPage.getByRole("button", { name: /sign out/i }).click();

    // The landing page renders both mobile and desktop layouts; filter to the visible copy.
    await expect(authedPage.getByTestId("signed-out-banner").filter({ visible: true })).toBeVisible();
  });

  test("mobile: sign-out from mobile top bar works", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedAuthToken(page);
    await setupMockDrive(page);
    await page.goto("/dashboard");

    // Mobile top-bar sign-out button (visible at 390px width)
    const mobileSignOut = page
      .getByTestId("mobile-top-bar")
      .getByRole("button", { name: /sign out/i });
    await expect(mobileSignOut).toBeVisible();
    await mobileSignOut.click();

    // The landing page renders both mobile and desktop layouts; filter to the visible copy.
    await expect(page.getByTestId("signed-out-banner").filter({ visible: true })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// A5 — Expired token is rejected and user is redirected to /
// ---------------------------------------------------------------------------

pwTest.describe("A5 — Expired token results in redirect", () => {
  pwTest("desktop: expired token in sessionStorage redirects to /", async ({ page }) => {
    await seedExpiredToken(page);
    await setupMockDrive(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/dashboard");

    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("button", { name: /sign in with google/i }),
    ).toBeVisible();
  });

  pwTest("mobile: expired token in sessionStorage redirects to /", async ({ page }) => {
    await seedExpiredToken(page);
    await setupMockDrive(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard");

    await expect(page).toHaveURL("/");
    await expect(
      page.getByTestId("landing-mobile-card").getByRole("button", { name: /sign in with google/i }),
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// A6 — OAuth callback success → authenticated → redirect to /dashboard
// ---------------------------------------------------------------------------

pwTest.describe("A6 — OAuth callback success", () => {
  pwTest(
    "valid code exchange authenticates user and redirects to /dashboard",
    async ({ page }) => {
      // Arrange — intercept the token exchange endpoint
      await page.route("**/api/auth/token", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            access_token: "e2e-callback-token",
            expires_in: 3600,
            scope: [
              "https://www.googleapis.com/auth/drive.appdata",
              "https://www.googleapis.com/auth/drive.file",
            ].join(" "),
            token_type: "Bearer",
          }),
        });
      });

      // Mock Drive so the dashboard can load after the redirect
      await setupMockDrive(page);

      // Seed PKCE state before navigating to the callback URL
      await seedPkceState(page, "test-oauth-state", "test-verifier");

      // Act — navigate to the callback URL
      await page.goto("/auth/callback?code=test-auth-code&state=test-oauth-state");

      // Assert — should end up on /dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
      await expect(page.getByRole("link", { name: /dashboard/i }).first()).toBeVisible();
    },
  );
});

// ---------------------------------------------------------------------------
// A11y — auth flows
// ---------------------------------------------------------------------------

pwTest.describe("A11y — auth pages (axe)", () => {
  pwTest("landing page has no axe violations (unauthenticated)", async ({ page }) => {
    // Arrange — mobile: desktop tree is aria-hidden; assert the visible mobile CTA
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(
      page.getByTestId("landing-mobile-card").getByRole("button", { name: /sign in with google/i }),
    ).toBeVisible();

    // Act
    const results = await new AxeBuilder({ page }).analyze();

    // Assert
    expect(results.violations).toEqual([]);
  });
});

test.describe("A11y — authenticated dashboard (axe)", () => {
  test("dashboard has no axe violations after sign-in", async ({ authedPage }) => {
    // Arrange — wait for the lazy-loaded dashboard page, not just the shell sidebar
    await expect(
      authedPage.getByRole("heading", { level: 1, name: /dashboard/i }),
    ).toBeVisible();

    // Act
    const results = await new AxeBuilder({ page: authedPage }).analyze();

    // Assert
    expect(results.violations).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// A7 — OAuth callback failure → redirect to / with error
// ---------------------------------------------------------------------------

pwTest.describe("A7 — OAuth callback failure", () => {
  pwTest("failed token exchange redirects to / and shows error", async ({ page }) => {
    // Arrange — token endpoint returns an error
    await page.route("**/api/auth/token", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: "invalid_grant",
          error_description: "Token has been expired or revoked.",
        }),
      });
    });

    await seedPkceState(page, "test-oauth-state", "test-verifier");

    // Act
    await page.goto("/auth/callback?code=bad-code&state=test-oauth-state");

    // Assert — redirected to landing with error message
    await expect(page).toHaveURL("/", { timeout: 10_000 });
    // The landing page renders both mobile and desktop layouts; filter to the visible copy.
    await expect(page.getByText(/token has been expired or revoked/i).filter({ visible: true })).toBeVisible();
  });

  pwTest(
    "Google returning an error param redirects to / and shows error",
    async ({ page }) => {
      await seedPkceState(page, "test-oauth-state", "test-verifier");

      // Simulate Google returning access_denied (no code, just error)
      await page.goto(
        "/auth/callback?error=access_denied&error_description=User+denied+access&state=test-oauth-state",
      );

      await expect(page).toHaveURL("/", { timeout: 10_000 });
      // The landing page renders both mobile and desktop layouts; filter to the visible copy.
      await expect(page.getByText(/user denied access/i).filter({ visible: true })).toBeVisible();
    },
  );
});
