import { type Page } from "@playwright/test";
import { FAKE_FILE_ID, FAKE_REVISION_ID } from "./auth-state";

/**
 * Minimal empty manifest — no projects, no attachments.
 * syncFolderLayout() short-circuits when there are no attachments and no
 * attachmentsFolderId, so no additional Drive folder calls are made.
 */
export const EMPTY_MANIFEST = {
  schemaVersion: 2,
  lastUpdated: new Date().toISOString(),
  summary: { totalCostBasisAdded: 0, totalDeductible: 0 },
  projects: [],
};

/**
 * Fixture manifest with two projects and a known cost-basis total ($47,500).
 * Used by D1/D2 dashboard tests to assert summary card values and project count.
 */
export const FIXTURE_MANIFEST = {
  schemaVersion: 2,
  lastUpdated: "2026-06-01T12:00:00.000Z",
  property: {
    address: "123 Oak Lane",
    city: "Austin",
    state: "TX",
    zip: "78701",
    propertyType: "primary_residence",
    sqftTotal: 2400,
  },
  summary: { totalCostBasisAdded: 47500, totalDeductible: 0 },
  projects: [
    {
      id: "550e8400-e29b-41d4-a716-446655440001",
      title: "Complete Roof Replacement",
      completionDate: "2025-09-15",
      totalCost: 28500,
      taxTreatment: "capital_improvement",
      costBasisAdjustment: 28500,
      deductibleAmount: 0,
      irsJustification: "Full roof replacement — extends useful life.",
      confidence: 0.95,
      attachments: [],
      createdAt: "2025-09-20T14:30:00.000Z",
      updatedAt: "2025-09-20T14:30:00.000Z",
      category: "roof",
      vendorName: "Austin Premier Roofing LLC",
      paymentMethod: "check",
      receiptDetailLevel: "itemized",
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440002",
      title: "Kitchen Remodel",
      completionDate: "2025-11-01",
      totalCost: 19000,
      taxTreatment: "capital_improvement",
      costBasisAdjustment: 19000,
      deductibleAmount: 0,
      irsJustification: "Full kitchen remodel — capital addition.",
      confidence: 0.9,
      attachments: [],
      createdAt: "2025-11-05T10:00:00.000Z",
      updatedAt: "2025-11-05T10:00:00.000Z",
      category: "kitchen",
      receiptDetailLevel: "lump_sum",
    },
  ],
};

/**
 * Install page.route() intercepts for all Google Drive API calls made by
 * DriveStorageDriver. Must be called before page.goto().
 *
 * Intercepted endpoints:
 *   GET  .../drive/v3/files?...           → file list (manifest locate)
 *   GET  .../drive/v3/files/:id?alt=media → manifest content download
 *   GET  .../drive/v3/files/:id?fields=headRevisionId → CAS head check
 *   POST .../upload/drive/v3/files?uploadType=multipart → manifest create
 *   PATCH .../upload/drive/v3/files/:id?uploadType=media → manifest write
 *   POST .../drive/v3/files/:id/copy      → backup copy (best-effort)
 *   GET  .../drive/v3/files?...bak...     → backup list
 *   POST oauth2.googleapis.com/revoke     → sign-out token revocation
 */
export async function setupMockDrive(
  page: Page,
  manifest?: object,
): Promise<void> {
  const activeManifest = manifest ?? EMPTY_MANIFEST;
  const driveApiBase = "**/www.googleapis.com/drive/v3";
  const uploadApiBase = "**/www.googleapis.com/upload/drive/v3";

  // --- Manifest locate: GET /files?spaces=appDataFolder&q=name%3D'manifest.json'... ---
  await page.route(`${driveApiBase}/files**`, async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    // Backup copy: POST /files/:id/copy
    if (method === "POST" && url.includes("/copy")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "e2e-backup-id",
          name: "manifest.bak.json",
          headRevisionId: "e2e-backup-rev",
          modifiedTime: new Date().toISOString(),
          createdTime: new Date().toISOString(),
        }),
      });
      return;
    }

    // Backup list (contains "bak" in query)
    if (method === "GET" && url.includes("bak")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ files: [] }),
      });
      return;
    }

    // HEAD revision check: GET /files/:id?fields=headRevisionId
    if (method === "GET" && url.includes("fields=headRevisionId")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ headRevisionId: FAKE_REVISION_ID }),
      });
      return;
    }

    // Manifest content download: GET /files/:id?alt=media
    if (method === "GET" && url.includes("alt=media")) {
      await route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: JSON.stringify(activeManifest),
      });
      return;
    }

    // File list (manifest locate): GET /files?spaces=appDataFolder&q=...
    if (method === "GET" && url.includes("spaces=appDataFolder")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          files: [
            {
              id: FAKE_FILE_ID,
              name: "manifest.json",
              headRevisionId: FAKE_REVISION_ID,
              modifiedTime: new Date().toISOString(),
              createdTime: new Date().toISOString(),
            },
          ],
        }),
      });
      return;
    }

    // DELETE (old backup pruning) — always succeed
    if (method === "DELETE") {
      await route.fulfill({ status: 204, body: "" });
      return;
    }

    // Fallback — fulfill with empty 200 so nothing hangs
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });

  // --- Manifest write: PATCH /upload/drive/v3/files/:id?uploadType=media ---
  await page.route(`${uploadApiBase}/files**`, async (route) => {
    const method = route.request().method();

    if (method === "PATCH") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: FAKE_FILE_ID,
          name: "manifest.json",
          headRevisionId: "e2e-revision-id-2",
          modifiedTime: new Date().toISOString(),
          createdTime: new Date().toISOString(),
        }),
      });
      return;
    }

    // POST (manifest create via multipart)
    if (method === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: FAKE_FILE_ID,
          name: "manifest.json",
          headRevisionId: FAKE_REVISION_ID,
          modifiedTime: new Date().toISOString(),
          createdTime: new Date().toISOString(),
        }),
      });
      return;
    }

    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
  });

  // --- Token revocation (sign-out best-effort call) ---
  await page.route("**/oauth2.googleapis.com/revoke**", async (route) => {
    await route.fulfill({ status: 200, body: "" });
  });
}
