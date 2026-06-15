import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("loads and shows hero heading text", async ({ page }) => {
    await page.goto("/");
    const heading = page.getByRole("heading", { level: 1, name: /capital improvements/i });
    await expect(heading).toBeVisible();
  });

  test("'See a demo' button navigates to /demo/dashboard", async ({ page }) => {
    await page.goto("/");
    const demoLink = page.getByRole("link", { name: /see a demo/i });
    await demoLink.click();
    await expect(page).toHaveURL(/\/demo/);
  });

  test("Sign-in button is visible and not disabled on initial load", async ({ page }) => {
    await page.goto("/");
    const signInButton = page.getByRole("button", { name: /sign in with google/i });
    await expect(signInButton).toBeVisible();
    await expect(signInButton).toBeEnabled();
  });

  test("Footer disclaimer text is visible", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer).toContainText("Not tax advice");
    await expect(footer).toContainText("For recordkeeping only");
  });
});
