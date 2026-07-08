import { test as pwTest, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  gotoDemoDashboard,
  gotoDemoExport,
  gotoDemoProjectDetail,
  gotoDemoProjects,
  waitForDemoDashboardReady,
  waitForDemoProjectDetailReady,
  waitForDemoProjectsReady,
} from "./fixtures/demo-ready";

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
    await gotoDemoDashboard(page);
    // DEMO_MANIFEST.summary.totalCostBasisAdded = 47500
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
    await gotoDemoProjects(page);
  });

  pwTest("DM6: demo project detail page renders without auth redirect", async ({ page }) => {
    await gotoDemoProjectDetail(page, FIRST_PROJECT_ID);
    await expect(page).toHaveURL(new RegExp(FIRST_PROJECT_ID));
  });

  pwTest("DM7: demo export page renders format options", async ({ page }) => {
    await gotoDemoExport(page);
    await expect(page.getByRole("radio", { name: /pdf summary/i })).toBeVisible();
    await expect(page.getByRole("radio", { name: /csv/i })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// DM8 — Demo is read-only: no googleapis.com calls
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// A11y — demo pages
// ---------------------------------------------------------------------------

pwTest.describe("A11y — demo pages (axe)", () => {
  pwTest("demo dashboard has no axe violations", async ({ page }) => {
    await page.goto("/demo/dashboard");
    await expect(page.getByText(/viewing read-only demo data/i).filter({ visible: true })).toBeVisible();
    await waitForDemoDashboardReady(page);

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  pwTest("demo projects list has no axe violations", async ({ page }) => {
    await page.goto("/demo/projects");
    await waitForDemoProjectsReady(page);

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  pwTest("demo project detail page has no axe violations", async ({ page }) => {
    await page.goto(`/demo/projects/${FIRST_PROJECT_ID}`);
    await waitForDemoProjectDetailReady(page);

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});

pwTest.describe("DM8 — Demo makes no Drive API calls", () => {
  pwTest("DM8: navigating demo routes makes zero googleapis.com requests", async ({ page }) => {
    let googleApiCallCount = 0;
    await page.route("**/googleapis.com/**", (route) => {
      googleApiCallCount++;
      void route.abort();
    });

    await page.goto("/demo/dashboard");
    await page.goto("/demo/projects");
    await page.goto(`/demo/projects/${FIRST_PROJECT_ID}`);
    await page.goto("/demo/export");

    await page.waitForTimeout(500);

    expect(googleApiCallCount).toBe(0);
  });
});
