import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("loads and shows hero text", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: /capital improvements/i }),
    ).toBeVisible();

    await expect(
      page.getByText(/track home improvements/i),
    ).toBeVisible();
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
});
