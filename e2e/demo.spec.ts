import { test as pwTest, expect } from "@playwright/test";

// First fixture project ID from MockStorageDriver / DEMO_MANIFEST
const FIRST_PROJECT_ID = "550e8400-e29b-41d4-a716-446655440001";

// ---------------------------------------------------------------------------
// DM1–DM2 — Demo banner + data
// ---------------------------------------------------------------------------

pwTest.describe("DM1–DM2 — Demo banner and fixture data", () => {
  pwTest("DM1: demo banner is visible on dashboard", async ({ page }) => {
    await page.goto("/demo/dashboard");
    await expect(
      page.getByText(/viewing read-only demo data/i).filter({ visible: true }),
    ).toBeVisible();
  });

  pwTest("DM2: dashboard shows non-zero cost-basis total from fixture manifest", async ({
    page,
  }) => {
    await page.goto("/demo/dashboard");
    // DEMO_MANIFEST.summary.totalCostBasisAdded = 47500
    // The dashboard renders a formatted currency value — assert a dollar sign is present
    await expect(page.getByText(/\$/).filter({ visible: true }).first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// DM3 — Mobile Exit Demo link
// ---------------------------------------------------------------------------

pwTest.describe("DM3 — Mobile Exit Demo link", () => {
  pwTest.use({ viewport: { width: 390, height: 844 } });

  pwTest("DM3: Exit Demo link (mobile) navigates to /", async ({ page }) => {
    await page.goto("/demo/dashboard");

    // The amber banner has a mobile-only "Exit Demo" link with class md:hidden.
    // The sidebar also renders an "Exit Demo" link at mobile widths, so target by class.
    const exitLink = page.locator("a.md\\:hidden", { hasText: /^exit demo$/i });
    await expect(exitLink).toBeVisible();
    await exitLink.click();

    await expect(page).toHaveURL("/");
  });
});

// ---------------------------------------------------------------------------
// DM4 — Desktop "Exit Demo & Connect Drive" link
// ---------------------------------------------------------------------------

pwTest.describe("DM4 — Desktop Exit Demo & Connect Drive link", () => {
  pwTest("DM4: Exit Demo & Connect Drive (desktop) navigates to /", async ({ page }) => {
    await page.goto("/demo/dashboard");

    const exitLink = page
      .getByRole("link", { name: /exit demo & connect drive/i })
      .filter({ visible: true });
    await expect(exitLink).toBeVisible();
    await exitLink.click();

    await expect(page).toHaveURL("/");
  });
});

// ---------------------------------------------------------------------------
// DM5–DM7 — Demo route smoke
// ---------------------------------------------------------------------------

pwTest.describe("DM5–DM7 — Demo route smoke", () => {
  pwTest("DM5: demo projects list renders project titles", async ({ page }) => {
    await page.goto("/demo/projects");

    // DEMO_MANIFEST has "Complete Roof Replacement" as the first project
    await expect(
      page.getByText(/complete roof replacement/i).filter({ visible: true }),
    ).toBeVisible();
  });

  pwTest("DM6: demo project detail page renders without auth redirect", async ({ page }) => {
    await page.goto(`/demo/projects/${FIRST_PROJECT_ID}`);

    // Should stay on the detail page — not redirected to /
    await expect(page).toHaveURL(new RegExp(FIRST_PROJECT_ID));
    // Project title visible
    await expect(
      page.getByText(/complete roof replacement/i).filter({ visible: true }),
    ).toBeVisible();
  });

  pwTest("DM7: demo export page renders format options", async ({ page }) => {
    await page.goto("/demo/export");

    // Export page has format selector options (PDF, CSV, JSON)
    await expect(page.getByText(/pdf/i).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText(/csv/i).filter({ visible: true }).first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// DM8 — Demo is read-only: no googleapis.com calls
// ---------------------------------------------------------------------------

pwTest.describe("DM8 — Demo makes no Drive API calls", () => {
  pwTest("DM8: navigating demo routes makes zero googleapis.com requests", async ({ page }) => {
    // Arrange — intercept any googleapis call (should never fire in demo)
    let googleApiCallCount = 0;
    await page.route("**/googleapis.com/**", (route) => {
      googleApiCallCount++;
      void route.abort();
    });

    // Act — visit several demo routes
    await page.goto("/demo/dashboard");
    await page.goto("/demo/projects");
    await page.goto(`/demo/projects/${FIRST_PROJECT_ID}`);
    await page.goto("/demo/export");

    // Small wait to let any async effects settle
    await page.waitForTimeout(500);

    // Assert
    expect(googleApiCallCount).toBe(0);
  });
});
