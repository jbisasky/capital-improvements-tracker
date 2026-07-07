import { test, expect } from "./fixtures/index";
import { test as pwTest } from "@playwright/test";
import { seedAuthToken } from "./fixtures/auth-state";
import { setupMockDrive, FIXTURE_MANIFEST, EMPTY_MANIFEST } from "./fixtures/mock-drive";

// ---------------------------------------------------------------------------
// P1 — Projects list renders all fixture projects with title + cost
// ---------------------------------------------------------------------------

test.describe("P1 — Projects list renders", () => {
  test("all fixture project titles and costs are listed", async ({ page }) => {
    await seedAuthToken(page);
    await setupMockDrive(page, FIXTURE_MANIFEST);
    await page.goto("/projects");

    await expect(page.getByText("Complete Roof Replacement")).toBeVisible();
    await expect(page.getByText("Kitchen Remodel")).toBeVisible();
    await expect(page.getByText("$28,500")).toBeVisible();
    await expect(page.getByText("$19,000")).toBeVisible();
  });

  test("mobile: project list accessible from bottom nav", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedAuthToken(page);
    await setupMockDrive(page, FIXTURE_MANIFEST);
    await page.goto("/projects");

    await expect(page.getByText("Complete Roof Replacement")).toBeVisible();
    await expect(page.getByText("Kitchen Remodel")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// P2 — Project detail page loads for a specific fixture project
// ---------------------------------------------------------------------------

test.describe("P2 — Project detail page loads", () => {
  test("navigating to /projects/:id shows detail fields", async ({ page }) => {
    await seedAuthToken(page);
    await setupMockDrive(page, FIXTURE_MANIFEST);
    await page.goto("/projects/550e8400-e29b-41d4-a716-446655440001");

    await expect(page.getByRole("heading", { name: "Complete Roof Replacement" })).toBeVisible();
    // Total Cost card — scope to avoid strict violation (cost basis is also $28,500)
    const totalCostCard = page.locator("div.rounded-lg.border.p-4", {
      has: page.getByText("Total Cost"),
    }).first();
    await expect(totalCostCard.getByText("$28,500")).toBeVisible();
    // Vendor shown in details
    await expect(page.getByText("Austin Premier Roofing LLC")).toBeVisible();
  });

  test("clicking a project from the list navigates to detail", async ({ page }) => {
    await seedAuthToken(page);
    await setupMockDrive(page, FIXTURE_MANIFEST);
    await page.goto("/projects");

    await page.getByText("Kitchen Remodel").click();

    await expect(page).toHaveURL(/\/projects\/550e8400-e29b-41d4-a716-446655440002/);
    await expect(page.getByRole("heading", { name: "Kitchen Remodel" })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// P3 — Add project manually (happy path)
// ---------------------------------------------------------------------------

test.describe("P3 — Add project manually (happy path)", () => {
  test("fill form and submit — project appears in list", async ({ page }) => {
    await seedAuthToken(page);
    await setupMockDrive(page, EMPTY_MANIFEST);
    await page.goto("/projects/new");

    // Skip to manual entry
    await page.getByRole("button", { name: /enter details manually/i }).click();

    // Fill required fields
    await page.getByLabel(/title/i).fill("New Bathroom Renovation");
    await page.getByLabel(/completion date/i).fill("2025-06-15");
    await page.getByLabel(/total cost/i).fill("12000");

    // Submit — Drive write is mocked to succeed
    await page.getByRole("button", { name: /create project/i }).click();

    // Should navigate to the new project's detail page
    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "New Bathroom Renovation" })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// P4 — Add project — required field missing
// ---------------------------------------------------------------------------

test.describe("P4 — Add project — required field missing", () => {
  test("submitting without a title shows validation error and does not navigate", async ({ page }) => {
    await seedAuthToken(page);
    await setupMockDrive(page, EMPTY_MANIFEST);
    await page.goto("/projects/new");

    await page.getByRole("button", { name: /enter details manually/i }).click();

    // Fill other required fields but leave title blank
    await page.getByLabel(/completion date/i).fill("2025-06-15");
    await page.getByLabel(/total cost/i).fill("5000");

    await page.getByRole("button", { name: /create project/i }).click();

    // Should stay on the new project page (HTML5 required prevents submit)
    await expect(page).toHaveURL(/\/projects\/new/);

    // Title input should be invalid (browser constraint)
    const titleInput = page.getByLabel(/title/i);
    await expect(titleInput).toBeVisible();
    // Validation message is set by the browser — verify input is still focused/invalid
    const isInvalid = await titleInput.evaluate(
      (el) => !(el as HTMLInputElement).validity.valid,
    );
    expect(isInvalid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// P5 — Edit project — change title, save, updated title shown
// ---------------------------------------------------------------------------

test.describe("P5 — Edit project", () => {
  test("changing the title and saving updates the detail page heading", async ({ page }) => {
    await seedAuthToken(page);
    await setupMockDrive(page, FIXTURE_MANIFEST);
    await page.goto("/projects/550e8400-e29b-41d4-a716-446655440002/edit");

    const titleInput = page.getByLabel(/title/i);
    await titleInput.clear();
    await titleInput.fill("Kitchen Remodel — Updated");

    await page.getByRole("button", { name: /save changes/i }).click();

    // Drive write succeeds — navigates back to detail
    await expect(page).toHaveURL(
      /\/projects\/550e8400-e29b-41d4-a716-446655440002$/,
      { timeout: 10_000 },
    );
    await expect(
      page.getByRole("heading", { name: "Kitchen Remodel — Updated" }),
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// P6 — Delete project — click delete, project removed from list
// ---------------------------------------------------------------------------

test.describe("P6 — Delete project", () => {
  test("clicking delete on detail page navigates back to list", async ({ page }) => {
    await seedAuthToken(page);
    await setupMockDrive(page, FIXTURE_MANIFEST);
    await page.goto("/projects/550e8400-e29b-41d4-a716-446655440001");

    await expect(
      page.getByRole("heading", { name: "Complete Roof Replacement" }),
    ).toBeVisible();

    await page.getByRole("button", { name: /delete/i }).click();

    // Navigates to /projects after delete
    await expect(page).toHaveURL(/\/projects$/, { timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// P7 — Drive write conflict (CAS failure) shows error message
// ---------------------------------------------------------------------------

pwTest.describe("P7 — Drive write conflict shows error", () => {
  pwTest(
    "conflicting headRevisionId on write returns DRIVE_CONFLICT error message",
    async ({ page }) => {
      await seedAuthToken(page);

      // Set up Drive routes — but make the headRevisionId check return a
      // *different* revision so the CAS guard triggers DRIVE_CONFLICT.
      await setupMockDrive(page, EMPTY_MANIFEST);

      // Override the headRevisionId check to return a mismatched revision
      await page.route("**/www.googleapis.com/drive/v3/files/**", async (route) => {
        const url = route.request().url();
        if (url.includes("fields=headRevisionId")) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ headRevisionId: "different-revision-id" }),
          });
          return;
        }
        await route.fallback();
      });

      await page.goto("/projects/new");
      await page.getByRole("button", { name: /enter details manually/i }).click();

      await page.getByLabel(/title/i).fill("Conflict Test Project");
      await page.getByLabel(/completion date/i).fill("2025-03-10");
      await page.getByLabel(/total cost/i).fill("1000");

      await page.getByRole("button", { name: /create project/i }).click();

      // The DRIVE_CONFLICT error should surface as a red error message
      await expect(
        page.getByText(/modified concurrently|conflict/i),
      ).toBeVisible({ timeout: 10_000 });
    },
  );
});

// ---------------------------------------------------------------------------
// P8 — Offline — write blocked, offline banner shown
// ---------------------------------------------------------------------------

pwTest.describe("P8 — Offline — write blocked", () => {
  pwTest(
    "going offline shows the offline banner and blocks saves",
    async ({ page }) => {
      await seedAuthToken(page);
      await setupMockDrive(page, EMPTY_MANIFEST);
      await page.goto("/projects/new");
      await page.getByRole("button", { name: /enter details manually/i }).click();

      // Go offline
      await page.context().setOffline(true);

      // Offline banner should appear
      await expect(page.getByTestId("offline-banner")).toBeVisible({ timeout: 5_000 });

      // Fill and attempt to submit
      await page.getByLabel(/title/i).fill("Offline Project");
      await page.getByLabel(/completion date/i).fill("2025-03-10");
      await page.getByLabel(/total cost/i).fill("500");
      await page.getByRole("button", { name: /create project/i }).click();

      // Should NOT navigate away — we're still on /projects/new
      await expect(page).toHaveURL(/\/projects\/new/);

      // Restore connectivity
      await page.context().setOffline(false);
    },
  );
});
