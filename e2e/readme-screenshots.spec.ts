import fs from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import {
  gotoDemoDashboard,
  gotoDemoProjectDetail,
  gotoDemoProjects,
  waitForDemoDashboardReady,
} from "./fixtures/demo-ready";
import { DOC_SCREENSHOT_OPTS, docScreenshotPath } from "./helpers/doc-screenshot";

const SCREENSHOT_DIR = "docs/screenshots";
const ROOF_PROJECT_ID = "550e8400-e29b-41d4-a716-446655440001";
const SOLAR_PROJECT_ID = "550e8400-e29b-41d4-a716-446655440005";
const LOCAL_BASE_URL = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:5173";
const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;

function ensureScreenshotDir(): void {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
}

function captureDocScreenshot(page: Page, basename: string): Promise<void> {
  return page.screenshot({
    path: docScreenshotPath(SCREENSHOT_DIR, basename),
    ...DOC_SCREENSHOT_OPTS,
  });
}

test.describe("README screenshots @screenshot", () => {
  test.beforeAll(() => {
    ensureScreenshotDir();
  });

  test("landing.jpg — desktop landing page", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.getByTestId("landing-dashboard-preview")).toBeVisible();
    await captureDocScreenshot(page, "landing.jpg");
  });

  test("mobile-landing.jpg — landing page on mobile", async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`${LOCAL_BASE_URL}/`);
    await expect(page.getByTestId("landing-mobile-hero")).toBeVisible();
    await captureDocScreenshot(page, "mobile-landing.jpg");
  });

  test("mobile-dashboard.jpg — demo dashboard on mobile", async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`${LOCAL_BASE_URL}/demo/dashboard`);
    await waitForDemoDashboardReady(page);
    await captureDocScreenshot(page, "mobile-dashboard.jpg");
  });

  test("mobile-project-detail.jpg — solar project on mobile", async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`${LOCAL_BASE_URL}/demo/projects/${SOLAR_PROJECT_ID}`);
    await expect(
      page.getByRole("heading", { level: 1, name: /solar panel installation/i }),
    ).toBeVisible();
    await captureDocScreenshot(page, "mobile-project-detail.jpg");
  });

  test("dashboard.jpg — demo dashboard on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoDemoDashboard(page);
    await captureDocScreenshot(page, "dashboard.jpg");
  });

  test("projects-list.jpg — demo projects list", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoDemoProjects(page);
    await captureDocScreenshot(page, "projects-list.jpg");
  });

  test("project-detail.jpg — demo project detail", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoDemoProjectDetail(page, ROOF_PROJECT_ID);
    await captureDocScreenshot(page, "project-detail.jpg");
  });
});
