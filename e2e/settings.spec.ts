import { test, expect } from "./fixtures/index";
import { test as pwTest } from "@playwright/test";
import { seedAuthToken } from "./fixtures/auth-state";
import { setupMockDrive, FIXTURE_MANIFEST, EMPTY_MANIFEST } from "./fixtures/mock-drive";

const GEMINI_API_GLOB = "**/generativelanguage.googleapis.com/**";

// ---------------------------------------------------------------------------
// S1 — Property form pre-fills from manifest
// ---------------------------------------------------------------------------

test.describe("S1 — Property form pre-fills from manifest", () => {
  test("address, city, state, zip are populated from fixture manifest", async ({ page }) => {
    await seedAuthToken(page);
    await setupMockDrive(page, FIXTURE_MANIFEST);
    await page.goto("/settings");

    await expect(page.locator("#address")).toHaveValue("123 Oak Lane");
    await expect(page.locator("#city")).toHaveValue("Austin");
    await expect(page.locator("#state")).toHaveValue("TX");
    await expect(page.locator("#zip")).toHaveValue("78701");
  });

  test("mobile: property form pre-fills on small viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedAuthToken(page);
    await setupMockDrive(page, FIXTURE_MANIFEST);
    await page.goto("/settings");

    await expect(page.locator("#address")).toHaveValue("123 Oak Lane");
    await expect(page.locator("#city")).toHaveValue("Austin");
  });
});

// ---------------------------------------------------------------------------
// S2 — Save property — happy path
// ---------------------------------------------------------------------------

test.describe("S2 — Save property happy path", () => {
  test("filling valid address and submitting shows Saved ✓ state", async ({ page }) => {
    await seedAuthToken(page);
    await setupMockDrive(page, FIXTURE_MANIFEST);
    await page.goto("/settings");

    // Update address to a fresh valid value
    await page.locator("#address").fill("456 Elm Street");
    await page.locator("#city").fill("Dallas");
    await page.locator("#state").selectOption("TX");
    await page.locator("#zip").fill("75201");

    await page.getByRole("button", { name: /save property/i }).click();

    // Button transitions to "Saved ✓"
    await expect(page.getByRole("button", { name: /saved/i })).toBeVisible({ timeout: 10_000 });
  });

  test("mobile: save property works on small viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedAuthToken(page);
    await setupMockDrive(page, FIXTURE_MANIFEST);
    await page.goto("/settings");

    await page.locator("#address").fill("789 Maple Ave");
    await page.locator("#city").fill("Houston");
    await page.locator("#state").selectOption("TX");
    await page.locator("#zip").fill("77001");

    await page.getByRole("button", { name: /save property/i }).click();

    await expect(page.getByRole("button", { name: /saved/i })).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// S3 — Save property — blank address rejected
// ---------------------------------------------------------------------------

test.describe("S3 — Save property — blank address rejected", () => {
  test("clearing address and submitting shows inline error, button stays Save", async ({ page }) => {
    await seedAuthToken(page);
    await setupMockDrive(page, FIXTURE_MANIFEST);
    await page.goto("/settings");

    // Wait for manifest to load so city/state/zip are pre-filled (prevents native required blocking)
    await expect(page.locator("#city")).toHaveValue("Austin", { timeout: 10_000 });

    await page.locator("#address").fill("");
    // Remove the native `required` attribute so the browser doesn't intercept
    // the submit before our JS validation handler runs.
    await page.locator("#address").evaluate((el) => { (el as HTMLInputElement).removeAttribute("required"); });

    await page.getByRole("button", { name: /save property/i }).click();

    await expect(page.getByText(/please enter your street address/i)).toBeVisible();
    // Button did not transition — still reads "Save Property"
    await expect(page.getByRole("button", { name: /save property/i })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// S4 — Save property — invalid address (no house number)
// ---------------------------------------------------------------------------

test.describe("S4 — Save property — invalid address (no number)", () => {
  test("address with no digits shows Include a house number error", async ({ page }) => {
    await seedAuthToken(page);
    await setupMockDrive(page, FIXTURE_MANIFEST);
    await page.goto("/settings");

    // Wait for manifest to pre-fill other required fields
    await expect(page.locator("#city")).toHaveValue("Austin", { timeout: 10_000 });

    await page.locator("#address").fill("NoNumbers");

    await page.getByRole("button", { name: /save property/i }).click();

    await expect(page.getByText(/include a house number and street name/i)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// S5 — Save property — blank city rejected
// ---------------------------------------------------------------------------

test.describe("S5 — Save property — blank city rejected", () => {
  test("clearing city and submitting shows inline city error", async ({ page }) => {
    await seedAuthToken(page);
    await setupMockDrive(page, FIXTURE_MANIFEST);
    await page.goto("/settings");

    // Wait for manifest to pre-fill address so native required doesn't block JS validation
    await expect(page.locator("#address")).toHaveValue("123 Oak Lane", { timeout: 10_000 });

    await page.locator("#city").fill("");
    await page.locator("#city").evaluate((el) => {
      (el as HTMLInputElement).removeAttribute("required");
      (el as HTMLInputElement).removeAttribute("minLength");
    });

    await page.getByRole("button", { name: /save property/i }).click();

    await expect(page.getByText(/please enter your city/i)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// S6 — Save property — state not selected
// ---------------------------------------------------------------------------

test.describe("S6 — Save property — state not selected", () => {
  test("clearing state selection shows inline state error", async ({ page }) => {
    await seedAuthToken(page);
    await setupMockDrive(page, FIXTURE_MANIFEST);
    await page.goto("/settings");

    // Wait for manifest to pre-fill address/city so native required doesn't block JS validation
    await expect(page.locator("#address")).toHaveValue("123 Oak Lane", { timeout: 10_000 });

    await page.locator("#state").selectOption("");
    await page.locator("#state").evaluate((el) => { (el as HTMLSelectElement).removeAttribute("required"); });

    await page.getByRole("button", { name: /save property/i }).click();

    await expect(page.getByText(/please select a state/i)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// S7 — Save property — Drive error on write
// ---------------------------------------------------------------------------

pwTest.describe("S7 — Save property — Drive write error shown", () => {
  pwTest("DRIVE_CONFLICT on write surfaces a Couldn't save error", async ({ page }) => {
    const expiresAt = Date.now() + 60 * 60 * 1000;
    await page.addInitScript(
      ({ token, expiry }: { token: string; expiry: number }) => {
        sessionStorage.setItem("auth_access_token", token);
        sessionStorage.setItem("auth_expires_at", String(expiry));
      },
      { token: "e2e-fake-token", expiry: expiresAt },
    );

    await setupMockDrive(page, FIXTURE_MANIFEST);

    // Override the headRevisionId check to return a mismatched revision so CAS fails
    await page.route("**/www.googleapis.com/drive/v3/files/**", async (route) => {
      const url = route.request().url();
      if (url.includes("fields=headRevisionId")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ headRevisionId: "stale-revision-id" }),
        });
        return;
      }
      await route.fallback();
    });

    await page.goto("/settings");

    await page.locator("#address").fill("789 Conflict St");
    await page.locator("#city").fill("Denver");
    await page.locator("#state").selectOption("CO");
    await page.locator("#zip").fill("80201");

    await page.getByRole("button", { name: /save property/i }).click();

    await expect(page.getByText(/couldn't save your property/i)).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// S8 — BYOK key save + test — valid key
// ---------------------------------------------------------------------------

test.describe("S8 — BYOK key — save and test (valid)", () => {
  test("entering key, clicking Test, Gemini returns 200 → Valid status shown", async ({ page }) => {
    await seedAuthToken(page);
    await setupMockDrive(page, EMPTY_MANIFEST);

    // Intercept Gemini ping — respond with a minimal success body
    await page.route(GEMINI_API_GLOB, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ candidates: [{ content: { parts: [{ text: "OK" }] } }] }),
      });
    });

    await page.goto("/settings");

    // Key input is shown when no key is configured
    const keyInput = page.getByPlaceholder(/enter api key/i);
    await keyInput.fill("AIzaSy_fake_valid_key");

    await page.getByRole("button", { name: /^test$/i }).click();

    await expect(page.getByText(/key is valid and working/i)).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// S9 — BYOK key save + test — invalid key
// ---------------------------------------------------------------------------

test.describe("S9 — BYOK key — test returns invalid", () => {
  test("Gemini ping returns 400 → Invalid or restricted status shown", async ({ page }) => {
    await seedAuthToken(page);
    await setupMockDrive(page, EMPTY_MANIFEST);

    // Intercept Gemini ping — respond with 400
    await page.route(GEMINI_API_GLOB, async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: { message: "API key not valid. Please pass a valid API key." } }),
      });
    });

    await page.goto("/settings");

    const keyInput = page.getByPlaceholder(/enter api key/i);
    await keyInput.fill("AIzaSy_fake_bad_key");

    await page.getByRole("button", { name: /^test$/i }).click();

    await expect(page.getByText(/invalid or restricted/i)).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// S10 — BYOK key remove
// ---------------------------------------------------------------------------

test.describe("S10 — BYOK key — remove", () => {
  test("key present → click Remove → key cleared, input re-shown", async ({ page }) => {
    await seedAuthToken(page);
    await setupMockDrive(page, EMPTY_MANIFEST);

    // Pre-seed a Gemini key into localStorage before the page loads.
    // Keys match gemini-key.ts: STORAGE_KEY="byok_gemini_key", STORAGE_META_KEY="byok_gemini_meta".
    await page.addInitScript(() => {
      localStorage.setItem("byok_gemini_key", "AIzaSy_fake_stored_key");
      localStorage.setItem(
        "byok_gemini_meta",
        JSON.stringify({ storedAt: new Date().toISOString(), expiryDays: 30, sessionOnly: false }),
      );
    });

    // Intercept Gemini in case Test is fired; just return 200
    await page.route(GEMINI_API_GLOB, async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({}) });
    });

    await page.goto("/settings");

    // "Key configured" indicator and Remove button should be visible
    await expect(page.getByText(/key configured/i)).toBeVisible();
    await page.getByRole("button", { name: /remove key/i }).click();

    // After removal the input should be visible again
    await expect(page.getByPlaceholder(/enter api key/i)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// S11 — Sign-out from settings
// ---------------------------------------------------------------------------

test.describe("S11 — Sign-out from settings", () => {
  test("clicking sign-out from sidebar on settings page redirects to /?signed_out=1", async ({ page }) => {
    await seedAuthToken(page);
    await setupMockDrive(page, EMPTY_MANIFEST);
    await page.goto("/settings");

    await page.getByRole("button", { name: /sign out/i }).click();

    await expect(page.getByTestId("signed-out-banner").filter({ visible: true })).toBeVisible();
  });
});
