import { ManifestSchema, type Manifest } from "@/domain/schemas";

const DB_NAME = "capital-improvements-tracker-offline";
const STORE_NAME = "manifest";
const CACHE_KEY = "latest";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (): void => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (): void => {
      resolve(request.result);
    };
    request.onerror = (): void => {
      reject(request.error ?? new Error("Failed to open IndexedDB"));
    };
  });
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const request = fn(store);
        request.onsuccess = (): void => {
          resolve(request.result);
        };
        request.onerror = (): void => {
          reject(request.error ?? new Error("IndexedDB request failed"));
        };
        tx.oncomplete = (): void => {
          db.close();
        };
        tx.onerror = (): void => {
          reject(tx.error ?? new Error("IndexedDB transaction failed"));
        };
      }),
  );
}

export async function saveManifestCache(manifest: Manifest): Promise<void> {
  await runTransaction("readwrite", (store) =>
    store.put(manifest, CACHE_KEY),
  );
}

export async function loadManifestCache(): Promise<Manifest | null> {
  try {
    const raw: unknown = await runTransaction("readonly", (store) =>
      store.get(CACHE_KEY),
    );
    if (raw == null) {
      return null;
    }
    return ManifestSchema.parse(raw);
  } catch {
    return null;
  }
}

export async function clearManifestCache(): Promise<void> {
  try {
    await runTransaction("readwrite", (store) => store.delete(CACHE_KEY));
  } catch {
    // no-op when IndexedDB unavailable (tests, private mode)
  }
}

export const OFFLINE_DB_NAME = DB_NAME;
