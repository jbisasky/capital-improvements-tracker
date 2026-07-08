import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Landing page", () => {
  test("loads and shows hero text inside dark hero block", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const hero = page.getByTestId("landing-mobile-hero");
    await expect(
      hero.getByRole("heading", { level: 1, name: /capital improvements/i }),
    ).toBeVisible();

    await expect(hero.getByText(/track home improvements/i)).toBeVisible();
  });

  test('"See a demo" button navigates to /demo/dashboard', async ({ page }) => {
    // Use mobile viewport: at desktop the mobile block is CSS-hidden, desktop block is aria-hidden
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const demoLink = page.getByTestId("landing-mobile-card").getByRole("link", { name: /see a demo/i });
    await expect(demoLink).toBeVisible();
    await demoLink.click();

    await expect(page).toHaveURL(/\/demo/);
  });

  test("Sign-in button is visible and clickable", async ({ page }) => {
    // Use mobile viewport so the sign-in button is accessible
    // (at desktop the mobile block is CSS-hidden; the desktop block is aria-hidden)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const signInBtn = page.getByTestId("landing-mobile-card").getByRole("button", {
      name: /sign in with google/i,
    });
    await expect(signInBtn).toBeVisible();
    await expect(signInBtn).toBeEnabled();
  });

  test("desktop ghost-layer layout screenshot", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    await expect(page.getByTestId("landing-dashboard-preview")).toBeVisible();
    await page.screenshot({
      path: "docs/test-reports/task8-screenshots/landing-desktop.png",
      fullPage: true,
    });
  });

  test("mobile layout screenshot", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await expect(page.getByTestId("landing-mobile-frame")).toBeVisible();
    await expect(page.getByTestId("landing-mobile-card")).toBeVisible();
    await expect(page.locator("#feature-list")).toBeVisible();
    await page.screenshot({
      path: "docs/test-reports/task8-screenshots/landing-mobile.png",
      fullPage: true,
    });
  });
});

// ---------------------------------------------------------------------------
// A11y — landing page
// ---------------------------------------------------------------------------

test.describe("Landing page accessibility (axe)", () => {
  test("desktop: no axe violations on /", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    // At desktop viewport the mobile block is CSS-hidden and the desktop block is aria-hidden,
    // so wait for the dashboard preview watermark to confirm the page is loaded.
    await expect(page.getByTestId("landing-dashboard-preview")).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("mobile: no axe violations on /", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByTestId("landing-mobile-hero")).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
