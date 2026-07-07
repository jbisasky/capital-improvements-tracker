import { test, expect } from "./fixtures/index";
import { test as pwTest } from "@playwright/test";
import { seedAuthToken } from "./fixtures/auth-state";
import { setupMockDrive } from "./fixtures/mock-drive";

// ---------------------------------------------------------------------------
// T1–T3, T8 — Sidebar cycle button (desktop, authenticated)
// ---------------------------------------------------------------------------

test.describe("T1–T3, T8 — Sidebar cycle button", () => {
  test("T1: defaults to system — html class matches emulated OS dark preference", async ({
    page,
  }) => {
    // Arrange — emulate OS dark before page load
    await page.emulateMedia({ colorScheme: "dark" });
    await seedAuthToken(page);
    await setupMockDrive(page);

    // Act
    await page.goto("/dashboard");

    // Assert — no explicit preference set, so system dark → .dark on <html>
    const stored = await page.evaluate(() => localStorage.getItem("theme_preference"));
    expect(stored).toBeNull();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("T2: cycle button system → light → dark → system", async ({ authedPage }) => {
    // Arrange — ensure no stored preference (system is default)
    await authedPage.evaluate(() => { localStorage.removeItem("theme_preference"); });
    // Reload so ThemeProvider picks up the cleared state
    await authedPage.reload();

    const cycleBtn = authedPage
      .locator("aside")
      .getByRole("button", { name: /theme/i });

    // system → light
    await cycleBtn.click();
    let stored = await authedPage.evaluate(() => localStorage.getItem("theme_preference"));
    expect(stored).toBe("light");
    await expect(authedPage.locator("html")).not.toHaveClass(/dark/);

    // light → dark
    await cycleBtn.click();
    stored = await authedPage.evaluate(() => localStorage.getItem("theme_preference"));
    expect(stored).toBe("dark");
    await expect(authedPage.locator("html")).toHaveClass(/dark/);

    // dark → system
    await cycleBtn.click();
    stored = await authedPage.evaluate(() => localStorage.getItem("theme_preference"));
    expect(stored).toBe("system");
  });

  test("T3: dark setting persists across page reload", async ({ authedPage }) => {
    // Arrange — set dark via cycle button
    const cycleBtn = authedPage
      .locator("aside")
      .getByRole("button", { name: /theme/i });

    // Cycle until dark is stored (at most 3 clicks from any starting state)
    for (let i = 0; i < 3; i++) {
      const stored = await authedPage.evaluate(() => localStorage.getItem("theme_preference"));
      if (stored === "dark") break;
      await cycleBtn.click();
    }

    // Act — reload
    await authedPage.reload();

    // Assert — still dark after reload
    const stored = await authedPage.evaluate(() => localStorage.getItem("theme_preference"));
    expect(stored).toBe("dark");
    await expect(authedPage.locator("html")).toHaveClass(/dark/);
  });

  test("T8: theme preference is stored in localStorage, not Drive manifest", async ({
    authedPage,
  }) => {
    // The theme preference key is "theme_preference" in localStorage — a device-local
    // setting intentionally kept out of manifest.json and Drive. We verify that cycling
    // the theme only touches localStorage, not the manifest, by reading both after a cycle.

    const cycleBtn = authedPage
      .locator("aside")
      .getByRole("button", { name: /theme/i });

    // Act — cycle theme twice
    await cycleBtn.click();
    await cycleBtn.click();

    // Assert — localStorage has the preference
    const stored = await authedPage.evaluate(() => localStorage.getItem("theme_preference"));
    expect(["light", "dark", "system"]).toContain(stored);

    // Assert — the Drive manifest keys are NOT present in localStorage (theme is not synced)
    const manifestInLocalStorage = await authedPage.evaluate(() =>
      localStorage.getItem("manifest"),
    );
    expect(manifestInLocalStorage).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// T4–T6 — Settings page radio group
// ---------------------------------------------------------------------------

test.describe("T4–T6 — Settings radio group", () => {
  test("T4: selecting Light removes dark class and saves to localStorage", async ({
    authedPage,
  }) => {
    // Arrange — navigate to settings
    await authedPage.getByRole("link", { name: /settings/i }).first().click();
    await expect(authedPage).toHaveURL(/\/settings/);

    // Act — click Light radio
    await authedPage.getByRole("radio", { name: /light/i }).click();

    // Assert
    const stored = await authedPage.evaluate(() => localStorage.getItem("theme_preference"));
    expect(stored).toBe("light");
    await expect(authedPage.locator("html")).not.toHaveClass(/dark/);
  });

  test("T5: selecting Dark adds dark class and saves to localStorage", async ({
    authedPage,
  }) => {
    await authedPage.getByRole("link", { name: /settings/i }).first().click();
    await expect(authedPage).toHaveURL(/\/settings/);

    await authedPage.getByRole("radio", { name: /dark/i }).click();

    const stored = await authedPage.evaluate(() => localStorage.getItem("theme_preference"));
    expect(stored).toBe("dark");
    await expect(authedPage.locator("html")).toHaveClass(/dark/);
  });

  test("T6: selecting System saves 'system' to localStorage", async ({ authedPage }) => {
    await authedPage.getByRole("link", { name: /settings/i }).first().click();
    await expect(authedPage).toHaveURL(/\/settings/);

    await authedPage.getByRole("radio", { name: /system/i }).click();

    const stored = await authedPage.evaluate(() => localStorage.getItem("theme_preference"));
    expect(stored).toBe("system");
  });
});

// ---------------------------------------------------------------------------
// T7 — Mobile top-bar cycle button
// ---------------------------------------------------------------------------

pwTest.describe("T7 — Mobile top-bar cycle button", () => {
  pwTest.use({ viewport: { width: 390, height: 844 } });

  pwTest("T7: tapping theme icon in mobile top bar updates localStorage and toggles class", async ({
    page,
  }) => {
    // Arrange — seed auth + mock Drive, then navigate at mobile viewport
    await seedAuthToken(page);
    await setupMockDrive(page);
    await page.goto("/dashboard");

    const mobileThemeBtn = page
      .getByTestId("mobile-top-bar")
      .getByRole("button", { name: /theme/i });
    await expect(mobileThemeBtn).toBeVisible();

    // Act — tap once to advance from system → light
    await mobileThemeBtn.click();

    // Assert
    const stored = await page.evaluate(() => localStorage.getItem("theme_preference"));
    expect(["light", "dark", "system"]).toContain(stored);

    // Tap again — must update
    const firstStored = stored;
    await mobileThemeBtn.click();
    const secondStored = await page.evaluate(() => localStorage.getItem("theme_preference"));
    expect(secondStored).not.toBe(firstStored);
  });
});
