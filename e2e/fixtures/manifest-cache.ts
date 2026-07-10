import { type Page } from "@playwright/test";

const OFFLINE_DB_NAME = "capital-improvements-tracker-offline";
const STORE_NAME = "manifest";
const CACHE_KEY = "latest";

/**
 * Write a manifest to IndexedDB before navigating to authenticated routes.
 * Simulates stale demo cache pollution from a prior /demo visit.
 */
export async function seedManifestCache(page: Page, manifest: object): Promise<void> {
  await page.goto("/");
  await page.evaluate(
    async ({ dbName, storeName, cacheKey, data }: {
      dbName: string;
      storeName: string;
      cacheKey: string;
      data: object;
    }) => {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = (): void => {
          if (!request.result.objectStoreNames.contains(storeName)) {
            request.result.createObjectStore(storeName);
          }
        };
        request.onerror = (): void => {
          reject(request.error ?? new Error("IndexedDB open failed"));
        };
        request.onsuccess = (): void => {
          const db = request.result;
          const tx = db.transaction(storeName, "readwrite");
          tx.objectStore(storeName).put(data, cacheKey);
          tx.oncomplete = (): void => {
            db.close();
            resolve();
          };
          tx.onerror = (): void => {
            reject(tx.error ?? new Error("IndexedDB write failed"));
          };
        };
      });
    },
    {
      dbName: OFFLINE_DB_NAME,
      storeName: STORE_NAME,
      cacheKey: CACHE_KEY,
      data: manifest,
    },
  );
}
