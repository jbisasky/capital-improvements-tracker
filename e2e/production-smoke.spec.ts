import { test, expect } from "@playwright/test";

const PRODUCTION_URL = "https://capital-improvements-tracker.pages.dev";

test.describe("Production smoke", () => {
  test.use({ baseURL: PRODUCTION_URL });

  test("landing page loads with sign-in and demo CTA", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: /capital improvements/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in with google/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /see a demo/i })).toBeVisible();
  });

  test("demo dashboard loads fixture data", async ({ page }) => {
    await page.goto("/demo/dashboard");

    await expect(page.getByText(/viewing read-only demo data/i)).toBeVisible();
    await expect(page.getByText(/\$47,500|\$82,250|8 projects/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("demo deep link /demo/projects loads", async ({ page }) => {
    await page.goto("/demo/projects");

    await expect(page.getByRole("heading", { name: /projects/i })).toBeVisible();
  });
});
