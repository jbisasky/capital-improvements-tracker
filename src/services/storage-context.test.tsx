import { type ReactElement } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { type Manifest } from "@/domain/schemas";
import { type Result, ok, err } from "@/domain/result";
import { appError } from "@/domain/errors";
import { DEMO_MANIFEST } from "@/services/fixtures";
import {
  type StorageDriver,
  type ManifestReadResult,
} from "@/services/storage-driver";
import { OfflineProvider } from "@/services/offline-context";
import { StorageProvider, useStorage } from "@/services/storage-context";

vi.mock("@/services/offline-manifest-cache", () => ({
  loadManifestCache: vi.fn(),
  saveManifestCache: vi.fn(),
}));

import { loadManifestCache, saveManifestCache } from "@/services/offline-manifest-cache";

const loadManifestCacheMock = vi.mocked(loadManifestCache);
const saveManifestCacheMock = vi.mocked(saveManifestCache);

const demoProject = DEMO_MANIFEST.projects[0];
if (demoProject == null) {
  throw new Error("DEMO_MANIFEST fixture must include at least one project");
}

const DRIVE_MANIFEST: Manifest = {
  ...DEMO_MANIFEST,
  projects: [
    {
      ...demoProject,
      title: "Drive Confirmed Project",
    },
  ],
};

type ReadManifestFn = () => Promise<Result<ManifestReadResult>>;

function createStubDriverFromReadManifest(readManifest: ReadManifestFn): StorageDriver {
  return {
    readManifest,
    writeManifest: vi.fn(),
    addProject: vi.fn(),
    addProjectWithAttachments: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    getProject: vi.fn(),
    uploadAttachment: vi.fn(),
    removeAttachment: vi.fn(),
    getAttachmentBlob: vi.fn(),
    listUnlinkedDriveFiles: vi.fn(),
    saveProperty: vi.fn(),
  };
}

function createStubDriver(
  readResult: Promise<Result<ManifestReadResult>>,
): StorageDriver {
  return createStubDriverFromReadManifest(vi.fn(() => readResult));
}

function StorageProbe(): ReactElement {
  const { manifest, loading, isViewingCachedData } = useStorage();
  return (
    <div>
      <span data-testid="loading">{loading ? "yes" : "no"}</span>
      <span data-testid="manifest">{manifest?.projects[0]?.title ?? "none"}</span>
      <span data-testid="cached">{isViewingCachedData ? "yes" : "no"}</span>
    </div>
  );
}

function renderProvider(
  driver: StorageDriver,
  persistOfflineCache = true,
): ReturnType<typeof render> {
  return render(
    <OfflineProvider>
      <StorageProvider driver={driver} persistOfflineCache={persistOfflineCache}>
        <StorageProbe />
      </StorageProvider>
    </OfflineProvider>,
  );
}

describe("StorageProvider loadManifest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadManifestCacheMock.mockResolvedValue(null);
    saveManifestCacheMock.mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });

  it("does not expose cached manifest while Drive fetch is in progress", async () => {
    // Arrange
    loadManifestCacheMock.mockResolvedValue(DEMO_MANIFEST);
    let resolveRead!: (value: Result<ManifestReadResult>) => void;
    const pendingRead = new Promise<Result<ManifestReadResult>>((resolve) => {
      resolveRead = resolve;
    });
    const driver = createStubDriver(pendingRead);

    // Act
    renderProvider(driver);

    // Assert — cached demo data must not flash before Drive confirms
    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("yes");
    });
    expect(screen.getByTestId("manifest")).toHaveTextContent("none");
    expect(screen.getByTestId("cached")).toHaveTextContent("no");

    resolveRead(
      ok({ manifest: DRIVE_MANIFEST, etag: "rev-1" }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("no");
    });
    expect(screen.getByTestId("manifest")).toHaveTextContent("Drive Confirmed Project");
    expect(saveManifestCacheMock).toHaveBeenCalledWith(DRIVE_MANIFEST);
  });

  it("persists successful reads when persistOfflineCache is true", async () => {
    // Arrange
    const driver = createStubDriver(
      Promise.resolve(ok({ manifest: DRIVE_MANIFEST, etag: "rev-1" })),
    );

    // Act
    renderProvider(driver, true);

    // Assert
    await waitFor(() => {
      expect(saveManifestCacheMock).toHaveBeenCalledWith(DRIVE_MANIFEST);
    });
  });

  it("does not persist successful reads when persistOfflineCache is false", async () => {
    // Arrange
    const driver = createStubDriver(
      Promise.resolve(ok({ manifest: DRIVE_MANIFEST, etag: "rev-1" })),
    );

    // Act
    renderProvider(driver, false);

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("no");
    });
    expect(saveManifestCacheMock).not.toHaveBeenCalled();
  });

  it("falls back to cached manifest when Drive fetch fails", async () => {
    // Arrange
    loadManifestCacheMock.mockResolvedValue(DEMO_MANIFEST);
    const driver = createStubDriver(
      Promise.resolve(err(appError("NETWORK_ERROR", "Drive unavailable"))),
    );

    // Act
    renderProvider(driver);

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("no");
    });
    expect(screen.getByTestId("manifest")).toHaveTextContent("Complete Roof Replacement");
    expect(screen.getByTestId("cached")).toHaveTextContent("yes");
  });

  it("shows cached manifest immediately on offline startup", async () => {
    // Arrange
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false,
    });
    loadManifestCacheMock.mockResolvedValue(DEMO_MANIFEST);
    const pendingRead = Promise.race<Result<ManifestReadResult>>([]);
    const readManifestMock = vi.fn(() => pendingRead);
    const driver = createStubDriverFromReadManifest(readManifestMock);

    // Act
    renderProvider(driver);

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("no");
    });
    expect(screen.getByTestId("manifest")).toHaveTextContent("Complete Roof Replacement");
    expect(screen.getByTestId("cached")).toHaveTextContent("yes");
    expect(readManifestMock).not.toHaveBeenCalled();
  });
});
