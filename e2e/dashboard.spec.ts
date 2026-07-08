import { test, expect } from "./fixtures/index";
import { test as pwTest } from "@playwright/test";
import { seedAuthToken } from "./fixtures/auth-state";
import { setupMockDrive, FIXTURE_MANIFEST, EMPTY_MANIFEST } from "./fixtures/mock-drive";
import AxeBuilder from "@axe-core/playwright";

// ---------------------------------------------------------------------------
// D1 — Dashboard loads fixture projects (summary card shows cost-basis total)
// ---------------------------------------------------------------------------

test.describe("D1 — Dashboard loads fixture projects", () => {
  test("Cost Basis Added card shows $47,500 from fixture manifest", async ({ page }) => {
    // Arrange — seed auth + Drive returning the fixture manifest
    await seedAuthToken(page);
    await setupMockDrive(page, FIXTURE_MANIFEST);
    await page.goto("/dashboard");

    // Assert — "Cost Basis Added" metric card shows $47,500
    // Scope to the card link that contains the "COST BASIS ADDED" label
    const costBasisCard = page.getByRole("link", { name: /cost basis added/i }).first();
    await expect(costBasisCard.getByText("$47,500")).toBeVisible();
  });

  test("mobile: Cost Basis Added card is visible on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedAuthToken(page);
    await setupMockDrive(page, FIXTURE_MANIFEST);
    await page.goto("/dashboard");

    const costBasisCard = page.getByRole("link", { name: /cost basis added/i }).first();
    await expect(costBasisCard.getByText("$47,500")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// D2 — Project count card shows correct count from fixture manifest
// ---------------------------------------------------------------------------

test.describe("D2 — Project count badge", () => {
  test("Projects metric card shows 2 (matching fixture manifest)", async ({ page }) => {
    // Arrange — fixture manifest has 2 projects
    await seedAuthToken(page);
    await setupMockDrive(page, FIXTURE_MANIFEST);
    await page.goto("/dashboard");

    // Assert — the "Projects" metric card value is "2"
    // The MetricCard renders the value in a <p> immediately after the label
    const projectsCard = page
      .locator("a", { has: page.getByText("Projects", { exact: true }) });
    await expect(projectsCard.getByText("2")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// D3 — Drive read error shows error banner with retry button
// ---------------------------------------------------------------------------

pwTest.describe("D3 — Drive read error shows error banner", () => {
  pwTest("500 from Drive file list renders error banner and retry button", async ({ page }) => {
    // Arrange — seed auth, but intercept ALL Drive calls with 500
    const expiresAt = Date.now() + 60 * 60 * 1000;
    await page.addInitScript(
      ({ token, expiry }: { token: string; expiry: number }) => {
        sessionStorage.setItem("auth_access_token", token);
        sessionStorage.setItem("auth_expires_at", String(expiry));
        // Clear the offline manifest cache so there's no fallback data
        void caches.keys().then((keys) => {
          keys.forEach((key) => void caches.delete(key));
        });
      },
      { token: "e2e-fake-token", expiry: expiresAt },
    );

    // Route all Drive API requests to return 500
    await page.route("**/www.googleapis.com/drive/**", async (route) => {
      await route.fulfill({ status: 500, body: JSON.stringify({ error: "Internal Server Error" }) });
    });
    await page.route("**/www.googleapis.com/upload/drive/**", async (route) => {
      await route.fulfill({ status: 500, body: JSON.stringify({ error: "Internal Server Error" }) });
    });
    // Also clear the IndexedDB manifest cache by overriding the cache read
    await page.addInitScript(() => {
      // Patch indexedDB.open so the cache driver returns nothing
      const origOpen = indexedDB.open.bind(indexedDB);
      indexedDB.open = (...args) => {
        const req = origOpen(...args);
        req.addEventListener("upgradeneeded", () => {/* allow schema creation */});
        return req;
      };
    });

    await page.goto("/dashboard");

    // Assert — error banner and retry button are visible
    await expect(page.getByTestId("dashboard-error-banner")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("dashboard-retry-button")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// D4 — Empty state: manifest with no projects shows empty state message
// ---------------------------------------------------------------------------

test.describe("D4 — Empty state (no projects)", () => {
  test("empty manifest shows 'No projects yet' message in recent projects", async ({ page }) => {
    // Arrange — empty manifest (0 projects)
    await seedAuthToken(page);
    await setupMockDrive(page, EMPTY_MANIFEST);
    await page.goto("/dashboard");

    // Assert — empty state text in the Recent Projects section
    await expect(
      page.getByText(/No projects yet/i),
    ).toBeVisible();
  });

  test("empty manifest shows 0 in Projects metric card", async ({ page }) => {
    await seedAuthToken(page);
    await setupMockDrive(page, EMPTY_MANIFEST);
    await page.goto("/dashboard");

    const projectsCard = page
      .locator("a", { has: page.getByText("Projects", { exact: true }) });
    await expect(projectsCard.getByText("0")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// A11y — dashboard
// ---------------------------------------------------------------------------

test.describe("A11y — dashboard (axe)", () => {
  test("dashboard with fixture data has no axe violations", async ({ authedPage }) => {
    // Arrange — wait for the lazy-loaded dashboard page content
    await expect(
      authedPage.getByRole("heading", { level: 1, name: /dashboard/i }),
    ).toBeVisible();
    await expect(authedPage.getByRole("link", { name: /cost basis added/i }).first()).toBeVisible();

    // Act
    const results = await new AxeBuilder({ page: authedPage }).analyze();

    // Assert
    expect(results.violations).toEqual([]);
  });
});
