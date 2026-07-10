import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DEMO_MANIFEST } from "@/services/fixtures";
import {
  saveManifestCache,
  loadManifestCache,
  clearManifestCache,
  OFFLINE_DB_NAME,
} from "@/services/offline-manifest-cache";

type StoreMode = "readonly" | "readwrite";

class FakeRequest<T> {
  result: T;
  onsuccess: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(result: T) {
    this.result = result;
  }

  dispatchSuccess(): void {
    this.onsuccess?.(new Event("success"));
  }

  dispatchError(): void {
    this.onerror?.(new Event("error"));
  }
}

class FakeObjectStore {
  private readonly data = new Map<string, unknown>();

  get(key: string): FakeRequest<unknown> {
    const request = new FakeRequest(this.data.get(key));
    queueMicrotask(() => {
      request.dispatchSuccess();
    });
    return request;
  }

  put(value: unknown, key: string): FakeRequest<undefined> {
    const request = new FakeRequest(undefined);
    queueMicrotask(() => {
      this.data.set(key, value);
      request.dispatchSuccess();
    });
    return request;
  }

  delete(key: string): FakeRequest<undefined> {
    const request = new FakeRequest(undefined);
    queueMicrotask(() => {
      this.data.delete(key);
      request.dispatchSuccess();
    });
    return request;
  }
}

class FakeTransaction {
  oncomplete: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private readonly store: FakeObjectStore;
  private readonly db: FakeDatabase;

  constructor(store: FakeObjectStore, db: FakeDatabase) {
    this.store = store;
    this.db = db;
  }

  objectStore(_name: string): FakeObjectStore {
    return this.store;
  }

  complete(): void {
    this.oncomplete?.();
    this.db.close();
  }
}

class FakeDatabase {
  closed = false;
  private readonly store: FakeObjectStore;

  constructor(store: FakeObjectStore) {
    this.store = store;
  }

  transaction(_storeName: string, _mode: StoreMode): FakeTransaction {
    return new FakeTransaction(this.store, this);
  }

  close(): void {
    this.closed = true;
  }
}

class FakeOpenRequest {
  result: FakeDatabase | null = null;
  onsuccess: ((event: Event) => void) | null = null;
  onupgradeneeded: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  private readonly store: FakeObjectStore;

  constructor(store: FakeObjectStore) {
    this.store = store;
    queueMicrotask(() => {
      this.result = new FakeDatabase(this.store);
      this.onsuccess?.(new Event("success"));
    });
  }
}

function createFakeIndexedDB(): IDBFactory {
  const store = new FakeObjectStore();
  return {
    open: (_name: string, _version?: number) => new FakeOpenRequest(store),
    deleteDatabase: vi.fn(),
    cmp: vi.fn(),
    databases: vi.fn(),
  } as unknown as IDBFactory;
}

describe("offline-manifest-cache", () => {
  const originalIndexedDB = globalThis.indexedDB;

  beforeEach(() => {
    vi.stubGlobal("indexedDB", createFakeIndexedDB());
  });

  afterEach(() => {
    vi.stubGlobal("indexedDB", originalIndexedDB);
  });

  it("saves, loads, and clears the manifest round-trip", async () => {
    // Act — save
    await saveManifestCache(DEMO_MANIFEST);

    // Assert — load
    const loaded = await loadManifestCache();
    expect(loaded).toEqual(DEMO_MANIFEST);

    // Act — clear
    await clearManifestCache();

    // Assert — gone
    const afterClear = await loadManifestCache();
    expect(afterClear).toBeNull();
  });

  it("uses the expected database name", () => {
    expect(OFFLINE_DB_NAME).toBe("capital-improvements-tracker-offline");
  });
});
