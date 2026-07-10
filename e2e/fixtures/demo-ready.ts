import { type Page, expect } from "@playwright/test";

/**
 * MockStorageDriver.readManifest() resolves after ~300ms. During that window
 * demo pages show a loading shell without manifest-dependent controls.
 * These helpers wait for the loaded UI before interacting or scanning.
 */

export async function waitForDemoDashboardReady(page: Page): Promise<void> {
  await expect(
    page.getByRole("heading", { level: 1, name: /dashboard/i }).filter({ visible: true }),
  ).toBeVisible();
  // MockStorageDriver resolves readManifest after ~300ms; skeleton shows static chrome only.
  await expect(page.getByTestId("dashboard-skeleton")).toHaveCount(0);
  await expect(page.getByText("$47,500")).toBeVisible();
}

export async function waitForDemoProjectsReady(page: Page): Promise<void> {
  await expect(
    page.getByText(/complete roof replacement/i).filter({ visible: true }),
  ).toBeVisible();
}

export async function waitForDemoProjectDetailReady(page: Page): Promise<void> {
  await expect(
    page.getByRole("heading", { level: 1, name: /complete roof replacement/i }),
  ).toBeVisible();
}

export async function waitForDemoExportReady(page: Page): Promise<void> {
  await expect(page.getByText(/\d+ project/)).toBeVisible();
}

export async function gotoDemoDashboard(page: Page): Promise<void> {
  await page.goto("/demo/dashboard");
  await waitForDemoDashboardReady(page);
}

export async function gotoDemoProjects(page: Page): Promise<void> {
  await page.goto("/demo/projects");
  await waitForDemoProjectsReady(page);
}

export async function gotoDemoProjectDetail(page: Page, projectId: string): Promise<void> {
  await page.goto(`/demo/projects/${projectId}`);
  await waitForDemoProjectDetailReady(page);
}

export async function gotoDemoExport(page: Page): Promise<void> {
  await page.goto("/demo/export");
  await waitForDemoExportReady(page);
}
