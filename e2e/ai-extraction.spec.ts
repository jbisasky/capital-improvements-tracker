import { type Page, test as pwTest } from "@playwright/test";
import { test, expect } from "./fixtures/index";
import { seedAuthToken, seedGeminiKey } from "./fixtures/auth-state";
import { setupMockDrive, EMPTY_MANIFEST } from "./fixtures/mock-drive";
import {
  setupMockGemini,
  setupMockGeminiError,
  buildGeminiSuccessBody,
  GEMINI_GLOB,
  CANNED_EXTRACTION,
  ZERO_CONFIDENCE_EXTRACTION,
} from "./fixtures/mock-gemini";

/** Upload a fake PDF via the hidden file input on /projects/new. */
async function uploadFakeReceipt(
  page: Page,
  name = "receipt.pdf",
  sizeBytes = 1024,
): Promise<void> {
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name,
    mimeType: "application/pdf",
    buffer: Buffer.alloc(sizeBytes, "A"),
  });
}

// ---------------------------------------------------------------------------
// E1 — Happy path: extract → review step shown → accept → form pre-filled
// ---------------------------------------------------------------------------

test.describe("E1 — Happy path: extract, review, accept", () => {
  test("upload → Extract → review shows fields → accept → form pre-filled", async ({ page }) => {
    await seedAuthToken(page);
    await seedGeminiKey(page);
    await setupMockDrive(page, EMPTY_MANIFEST);
    await setupMockGemini(page);

    await page.goto("/projects/new");

    // Upload a fake receipt
    await uploadFakeReceipt(page);

    // Extract button is now visible (key configured + file present)
    await page.getByRole("button", { name: /extract details with ai/i }).click();

    // Review step renders with the extracted title
    await expect(page.getByText(/review extracted details/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("#ext-title")).toHaveValue(CANNED_EXTRACTION.title);
    await expect(page.locator("#ext-cost")).toHaveValue(String(CANNED_EXTRACTION.totalCost));

    // Accept the extraction
    await page.getByRole("button", { name: /looks good/i }).click();

    // Form step: title field is pre-filled from the extraction
    await expect(page.getByText(/fields below were pre-filled from ai extraction/i)).toBeVisible();
    await expect(page.getByLabel(/title/i)).toHaveValue(CANNED_EXTRACTION.title);
  });

  test("mobile: extract + review + accept works on small viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedAuthToken(page);
    await seedGeminiKey(page);
    await setupMockDrive(page, EMPTY_MANIFEST);
    await setupMockGemini(page);

    await page.goto("/projects/new");
    await uploadFakeReceipt(page);
    await page.getByRole("button", { name: /extract details with ai/i }).click();

    await expect(page.getByText(/review extracted details/i)).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /looks good/i }).click();

    await expect(page.getByLabel(/title/i)).toHaveValue(CANNED_EXTRACTION.title);
  });
});

// ---------------------------------------------------------------------------
// E2 — Review step: user edits a field before accepting
// ---------------------------------------------------------------------------

test.describe("E2 — Review step — user edits a field before accepting", () => {
  test("editing title in review → accept → form title matches edited value", async ({ page }) => {
    await seedAuthToken(page);
    await seedGeminiKey(page);
    await setupMockDrive(page, EMPTY_MANIFEST);
    await setupMockGemini(page);

    await page.goto("/projects/new");
    await uploadFakeReceipt(page);
    await page.getByRole("button", { name: /extract details with ai/i }).click();

    await expect(page.getByText(/review extracted details/i)).toBeVisible({ timeout: 10_000 });

    // Edit the title in the review form
    const titleInput = page.locator("#ext-title");
    await titleInput.clear();
    await titleInput.fill("HVAC Replacement — Updated");

    await page.getByRole("button", { name: /looks good/i }).click();

    // Form should reflect the edited title, not the original
    await expect(page.getByLabel(/title/i)).toHaveValue("HVAC Replacement — Updated");
  });
});

// ---------------------------------------------------------------------------
// E3 — Discard extraction → returns to upload step
// ---------------------------------------------------------------------------

test.describe("E3 — Discard extraction — returns to upload step", () => {
  test("clicking Discard in review returns to upload, form not pre-filled", async ({ page }) => {
    await seedAuthToken(page);
    await seedGeminiKey(page);
    await setupMockDrive(page, EMPTY_MANIFEST);
    await setupMockGemini(page);

    await page.goto("/projects/new");
    await uploadFakeReceipt(page);
    await page.getByRole("button", { name: /extract details with ai/i }).click();

    await expect(page.getByText(/review extracted details/i)).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: /discard/i }).click();

    // Back on the upload step — "Extract details with AI" button visible again
    await expect(page.getByRole("button", { name: /extract details with ai/i })).toBeVisible();
    // Review heading is gone
    await expect(page.getByText(/review extracted details/i)).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// E4 — No Gemini key configured → Extract button absent, Settings prompt shown
// ---------------------------------------------------------------------------

test.describe("E4 — No Gemini key → key prompt shown", () => {
  test("without a key, uploading a file shows Settings link instead of Extract button", async ({ page }) => {
    await seedAuthToken(page);
    await setupMockDrive(page, EMPTY_MANIFEST);
    // No seedGeminiKey call — localStorage is empty

    await page.goto("/projects/new");
    await uploadFakeReceipt(page);

    // Extract button should NOT be visible
    await expect(page.getByRole("button", { name: /extract details with ai/i })).not.toBeVisible();
    // Settings link prompt is shown inside the main content (not the sidebar nav)
    await expect(page.getByText(/add your gemini api key/i)).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("link", { name: /settings/i }),
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// E5 — Gemini API network failure → error shown, manual entry still works
// ---------------------------------------------------------------------------

pwTest.describe("E5 — Gemini network failure → error shown", () => {
  pwTest("aborted Gemini request shows error message on upload step", async ({ page }) => {
    const expiresAt = Date.now() + 60 * 60 * 1000;
    await page.addInitScript(
      ({ token, expiry }: { token: string; expiry: number }) => {
        sessionStorage.setItem("auth_access_token", token);
        sessionStorage.setItem("auth_expires_at", String(expiry));
        localStorage.setItem("byok_gemini_key", "AIzaSy_e2e_test_key");
        localStorage.setItem(
          "byok_gemini_meta",
          JSON.stringify({ storedAt: new Date().toISOString(), expiryDays: 30, sessionOnly: false }),
        );
      },
      { token: "e2e-fake-token", expiry: expiresAt },
    );

    await setupMockDrive(page, EMPTY_MANIFEST);

    // Abort all Gemini requests to simulate a network failure
    await page.route(GEMINI_GLOB, async (route) => {
      await route.abort("failed");
    });

    await page.goto("/projects/new");
    await uploadFakeReceipt(page);
    await page.getByRole("button", { name: /extract details with ai/i }).click();

    // Error message shown; review step is NOT shown
    await expect(page.getByText(/network error/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/review extracted details/i)).not.toBeVisible();

    // User can still proceed manually
    await expect(page.getByRole("button", { name: /enter details manually/i })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// E6 — Gemini returns invalid key (400) → specific error message shown
// ---------------------------------------------------------------------------

test.describe("E6 — Gemini invalid key (400) → error shown", () => {
  test("400 with API key error message surfaces in upload step", async ({ page }) => {
    await seedAuthToken(page);
    await seedGeminiKey(page);
    await setupMockDrive(page, EMPTY_MANIFEST);
    await setupMockGeminiError(page, 400, "API key not valid. Please pass a valid API key.");

    await page.goto("/projects/new");
    await uploadFakeReceipt(page);
    await page.getByRole("button", { name: /extract details with ai/i }).click();

    await expect(
      page.getByText(/invalid api key.*check your gemini key/i),
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// E7 — Gemini returns non-receipt (confidence=0) → doesn't appear to be a receipt
// ---------------------------------------------------------------------------

test.describe("E7 — Gemini returns zero-confidence (non-receipt)", () => {
  test("zero-confidence result shows not-a-receipt error", async ({ page }) => {
    await seedAuthToken(page);
    await seedGeminiKey(page);
    await setupMockDrive(page, EMPTY_MANIFEST);
    await setupMockGemini(page, ZERO_CONFIDENCE_EXTRACTION);

    await page.goto("/projects/new");
    await uploadFakeReceipt(page);
    await page.getByRole("button", { name: /extract details with ai/i }).click();

    await expect(
      page.getByText(/doesn't appear to be a receipt/i),
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// E8 — File too large (>15 MB) → error before API call, no network request
// ---------------------------------------------------------------------------

test.describe("E8 — File too large → error shown, no Gemini request made", () => {
  test("uploading a file >15 MB shows error and does not call Gemini", async ({ page }) => {
    await seedAuthToken(page);
    await seedGeminiKey(page);
    await setupMockDrive(page, EMPTY_MANIFEST);

    let geminiCalled = false;
    await page.route(GEMINI_GLOB, async (route) => {
      geminiCalled = true;
      await route.fulfill({ status: 200, body: "{}" });
    });

    await page.goto("/projects/new");

    // Upload a file slightly over the 15 MB limit
    const oversizeBytes = 16 * 1024 * 1024; // 16 MiB
    await uploadFakeReceipt(page, "huge-receipt.pdf", oversizeBytes);
    await page.getByRole("button", { name: /extract details with ai/i }).click();

    // Error shown — "Maximum is 15 MB"
    await expect(page.getByText(/maximum is 15 mb/i)).toBeVisible({ timeout: 10_000 });

    // Gemini was never called
    expect(geminiCalled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// E9 — Skip to manual → form shown without pre-fill
// ---------------------------------------------------------------------------

test.describe("E9 — Skip to manual entry", () => {
  test("clicking 'Enter details manually' shows form without AI pre-fill text", async ({ page }) => {
    await seedAuthToken(page);
    await seedGeminiKey(page);
    await setupMockDrive(page, EMPTY_MANIFEST);

    await page.goto("/projects/new");

    await page.getByRole("button", { name: /enter details manually/i }).click();

    // Form shown but pre-fill notice is absent
    await expect(page.getByLabel(/title/i)).toBeVisible();
    await expect(page.getByText(/fields below were pre-filled from ai extraction/i)).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// E10 — Multi-file extraction → single review with synthesized result
// ---------------------------------------------------------------------------

test.describe("E10 — Multi-file extraction → synthesized review", () => {
  test("uploading 2 files runs a single Gemini call and shows review", async ({ page }) => {
    await seedAuthToken(page);
    await seedGeminiKey(page);
    await setupMockDrive(page, EMPTY_MANIFEST);

    let geminiCallCount = 0;
    await page.route(GEMINI_GLOB, async (route) => {
      geminiCallCount++;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: buildGeminiSuccessBody(CANNED_EXTRACTION),
      });
    });

    await page.goto("/projects/new");

    // Upload two separate files
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([
      { name: "receipt1.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(512, "A") },
      { name: "invoice2.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(512, "B") },
    ]);

    await page.getByRole("button", { name: /extract details with ai/i }).click();

    // Single review step shown (one synthesized call)
    await expect(page.getByText(/review extracted details/i)).toBeVisible({ timeout: 10_000 });
    expect(geminiCallCount).toBe(1);
  });
});
