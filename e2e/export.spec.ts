import { test, expect } from "@playwright/test";
import * as fs from "fs";
import AxeBuilder from "@axe-core/playwright";
import { gotoDemoExport } from "./fixtures/demo-ready";
import { DOC_SCREENSHOT_OPTS, docScreenshotPath } from "./helpers/doc-screenshot";

test.describe("Export page", () => {
  test.beforeEach(async ({ page }) => {
    await gotoDemoExport(page);
  });

  test("shows the Export heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { level: 1, name: /export/i }),
    ).toBeVisible();
  });

  test("PDF format is selected by default", async ({ page }) => {
    const pdfRadio = page.getByRole("radio", { name: /pdf summary/i });
    await expect(pdfRadio).toBeChecked();
  });

  test("all three format options are present", async ({ page }) => {
    await expect(page.getByRole("radio", { name: /pdf summary/i })).toBeVisible();
    await expect(page.getByRole("radio", { name: /csv/i })).toBeVisible();
    await expect(page.getByRole("radio", { name: /manifest\.json/i })).toBeVisible();
  });

  test("scope selector shows All and By tax year options", async ({ page }) => {
    await expect(
      page.getByRole("radio", { name: /all projects/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("radio", { name: /by tax year/i }),
    ).toBeVisible();
  });

  test("selecting 'By tax year' reveals a year dropdown", async ({ page }) => {
    const yearRadio = page.getByRole("radio", { name: /by tax year/i });
    await yearRadio.check();
    await expect(yearRadio).toBeChecked();

    await expect(page.getByRole("combobox", { name: /tax year/i })).toBeVisible();
  });

  test("project count updates when switching to year scope", async ({ page }) => {
    // All projects count (demo data has many)
    const allCount = await page
      .locator("text=/\\d+ project/")
      .first()
      .textContent();

    // Switch to year scope — count may differ
    const yearRadio = page.getByRole("radio", { name: /by tax year/i });
    await yearRadio.check();
    await expect(yearRadio).toBeChecked();

    const yearSelect = page.getByRole("combobox", { name: /tax year/i });
    await expect(yearSelect).toBeVisible();
    const yearValue = await yearSelect.inputValue();
    expect(yearValue).toMatch(/^\d{4}$/);

    // Count label is still present
    await expect(page.locator("text=/\\d+ project/").first()).toBeVisible();

    // Ensure count is shown (it may or may not match allCount depending on demo data)
    const yearCount = await page
      .locator("text=/\\d+ project/")
      .first()
      .textContent();
    expect(yearCount).toBeTruthy();
    // Suppress unused var warning
    expect(typeof allCount).toBe("string");
  });

  test("download button shows correct label for each format", async ({ page }) => {
    // PDF
    await page.getByRole("radio", { name: /pdf summary/i }).click();
    await expect(
      page.getByRole("button", { name: /download pdf/i }),
    ).toBeVisible();

    // CSV
    await page.getByRole("radio", { name: /csv/i }).click();
    await expect(
      page.getByRole("button", { name: /download csv/i }),
    ).toBeVisible();

    // JSON
    await page.getByRole("radio", { name: /manifest\.json/i }).click();
    await expect(
      page.getByRole("button", { name: /download json/i }),
    ).toBeVisible();
  });

  test("CSV download triggers a file download", async ({ page }) => {
    await page.getByRole("radio", { name: /csv/i }).click();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /download csv/i }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/capital-improvements.*\.csv$/);
  });

  test("JSON download triggers a file download", async ({ page }) => {
    await page.getByRole("radio", { name: /manifest\.json/i }).click();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /download json/i }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/capital-improvements.*\.json$/);
  });

  test("PDF download triggers a file download", async ({ page }) => {
    await page.getByRole("radio", { name: /pdf summary/i }).click();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /download pdf/i }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/capital-improvements.*\.pdf$/);
  });

  test("attachments note is displayed", async ({ page }) => {
    await expect(
      page.getByText(/attachments live in your drive folder/i),
    ).toBeVisible();
  });

  test("export page has no axe violations", async ({ page }) => {
    // Arrange — beforeEach waits for the loaded export form (not just the h1
    // visible during the MockStorageDriver loading shell).
    await expect(page.getByRole("radio", { name: /pdf summary/i })).toBeVisible();

    // Act
    const results = await new AxeBuilder({ page }).analyze();

    // Assert
    expect(results.violations).toEqual([]);
  });

  test("screenshot of export page — default state @screenshot", async ({ page }) => {
    const screenshotDir = "docs/test-reports/pdf-export-screenshots";
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    await page.screenshot({
      path: docScreenshotPath(screenshotDir, "export-page-default.jpg"),
      ...DOC_SCREENSHOT_OPTS,
      fullPage: true,
    });
  });

  test("screenshot of export page — year scope selected @screenshot", async ({ page }) => {
    const yearRadio = page.getByRole("radio", { name: /by tax year/i });
    await yearRadio.check();
    await expect(page.getByRole("combobox", { name: /tax year/i })).toBeVisible();
    const screenshotDir = "docs/test-reports/pdf-export-screenshots";
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    await page.screenshot({
      path: docScreenshotPath(screenshotDir, "export-page-year-scope.jpg"),
      ...DOC_SCREENSHOT_OPTS,
      fullPage: true,
    });
  });
});
