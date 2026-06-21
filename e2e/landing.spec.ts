import { test, expect } from "@playwright/test";

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
    await page.goto("/");

    const demoLink = page.getByRole("link", { name: /see a demo/i });
    await expect(demoLink).toBeVisible();
    await demoLink.click();

    await expect(page).toHaveURL(/\/demo/);
  });

  test("Sign-in button is visible and clickable", async ({ page }) => {
    await page.goto("/");

    const signInBtn = page.getByRole("button", {
      name: /sign in with google/i,
    });
    await expect(signInBtn).toBeVisible();
    await expect(signInBtn).toBeEnabled();
  });

  test("desktop split-screen layout screenshot", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    await expect(page.locator(".grid-cols-2")).toBeVisible();
    await page.screenshot({
      path: "docs/test-reports/task8-screenshots/landing-desktop.png",
      fullPage: true,
    });
  });

  test("mobile layout screenshot", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await expect(page.getByTestId("landing-mobile-canvas")).toBeVisible();
    await expect(page.locator("#feature-list")).toBeVisible();
    await page.screenshot({
      path: "docs/test-reports/task8-screenshots/landing-mobile.png",
      fullPage: true,
    });
  });
});
