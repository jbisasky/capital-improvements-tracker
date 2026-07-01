import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactElement,
  type ReactNode,
} from "react";
import { type Manifest, type Project, type PropertyProfile } from "@/domain/schemas";
import { type DocAssessment, assessDocumentation } from "@/domain/doc-completeness";
import {
  type StorageDriver,
  type ManifestReadResult,
  type UnlinkedDriveFile,
} from "@/services/storage-driver";
import { type Result } from "@/domain/result";
import { ATTACHMENTS_ROOT_FOLDER_NAME } from "@/services/drive-attachment";
import {
  loadManifestCache,
  saveManifestCache,
} from "@/services/offline-manifest-cache";
import { offlineWriteResult } from "@/services/offline-error";
import { useOffline } from "@/services/offline-context";

interface StorageState {
  manifest: Manifest | null;
  etag: string | null;
  loading: boolean;
  error: string | null;
}

interface StorageContextValue extends StorageState {
  reload: () => Promise<void>;
  isViewingCachedData: boolean;
  writesDisabled: boolean;
  addProject: (project: Project) => Promise<Result<Manifest>>;
  addProjectWithAttachments: (
    project: Project,
    files: File[],
  ) => Promise<Result<Manifest>>;
  updateProject: (id: string, project: Project) => Promise<Result<Manifest>>;
  deleteProject: (id: string) => Promise<Result<Manifest>>;
  uploadAttachment: (projectId: string, file: File) => Promise<Result<Manifest>>;
  removeAttachment: (projectId: string, fileId: string) => Promise<Result<Manifest>>;
  getAttachmentBlob: (projectId: string, fileId: string) => Promise<Result<Blob>>;
  listUnlinkedDriveFiles: () => Promise<Result<UnlinkedDriveFile[]>>;
  getDocAssessment: (project: Project) => DocAssessment;
  saveProperty: (property: PropertyProfile) => Promise<Result<Manifest>>;
  attachmentsFolderId: string | null;
  attachmentsFolderName: string;
}

const StorageContext = createContext<StorageContextValue | null>(null);

interface StorageProviderProps {
  driver: StorageDriver;
  children: ReactNode;
}

function applyManifestUpdate(
  setState: React.Dispatch<React.SetStateAction<StorageState>>,
  manifest: Manifest,
): void {
  setState((prev) => ({
    ...prev,
    manifest,
  }));
}

export function StorageProvider({
  driver,
  children,
}: StorageProviderProps): ReactElement {
  const { isOnline } = useOffline();
  const [state, setState] = useState<StorageState>({
    manifest: null,
    etag: null,
    loading: true,
    error: null,
  });
  const [isViewingCachedData, setIsViewingCachedData] = useState(false);

  const loadManifest = useCallback(async (): Promise<void> => {
    // Stale-while-revalidate: show cached data immediately so the dashboard
    // renders without waiting for the Drive round-trip (~5–15s). The Drive
    // fetch runs in the background and replaces the cached data when it lands.
    const cached = await loadManifestCache();
    if (cached != null) {
      setIsViewingCachedData(true);
      setState({
        manifest: cached,
        etag: null,
        loading: true, // still loading — background refresh in progress
        error: null,
      });
    } else {
      setState((prev) => ({ ...prev, loading: true, error: null }));
    }

    const result: Result<ManifestReadResult> = await driver.readManifest();
    if (result.ok) {
      await saveManifestCache(result.value.manifest);
      setIsViewingCachedData(false);
      setState({
        manifest: result.value.manifest,
        etag: result.value.etag,
        loading: false,
        error: null,
      });
      return;
    }

    // Drive fetch failed. If we already showed cached data, keep showing it
    // (offline or transient error) rather than blanking the screen.
    if (cached != null) {
      if (!navigator.onLine) {
        // Already showing cached data — just mark as not loading.
        setState((prev) => ({ ...prev, loading: false }));
      } else {
        // Online but Drive call failed — show cached data with an error banner.
        setIsViewingCachedData(true);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: result.error.message,
        }));
      }
      return;
    }

    // No cache at all and Drive failed.
    if (!navigator.onLine) {
      // Nothing we can do offline without a cache.
      setIsViewingCachedData(false);
      setState({ manifest: null, etag: null, loading: false, error: result.error.message });
      return;
    }

    setIsViewingCachedData(false);
    setState({
      manifest: null,
      etag: null,
      loading: false,
      error: result.error.message,
    });
  }, [driver]);

  const initialized = useRef<boolean | null>(null);
  if (initialized.current == null) {
    initialized.current = true;
    void loadManifest();
  }

  useEffect(() => {
    const handleOnline = (): void => {
      void loadManifest();
    };
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [loadManifest]);

  const guardWrite = useCallback((): Result<never> | null => {
    if (!isOnline) {
      return offlineWriteResult();
    }
    return null;
  }, [isOnline]);

  const addProject = useCallback(
    async (project: Project): Promise<Result<Manifest>> => {
      const blocked = guardWrite();
      if (blocked != null) {
        return blocked;
      }
      const result = await driver.addProject(project);
      if (result.ok) {
        applyManifestUpdate(setState, result.value);
      }
      return result;
    },
    [driver, guardWrite],
  );

  const addProjectWithAttachments = useCallback(
    async (project: Project, files: File[]): Promise<Result<Manifest>> => {
      const blocked = guardWrite();
      if (blocked != null) {
        return blocked;
      }
      const result = await driver.addProjectWithAttachments(project, files);
      if (result.ok) {
        applyManifestUpdate(setState, result.value);
      }
      return result;
    },
    [driver, guardWrite],
  );

  const updateProject = useCallback(
    async (id: string, project: Project): Promise<Result<Manifest>> => {
      const blocked = guardWrite();
      if (blocked != null) {
        return blocked;
      }
      const result = await driver.updateProject(id, project);
      if (result.ok) {
        applyManifestUpdate(setState, result.value);
      }
      return result;
    },
    [driver, guardWrite],
  );

  const deleteProject = useCallback(
    async (id: string): Promise<Result<Manifest>> => {
      const blocked = guardWrite();
      if (blocked != null) {
        return blocked;
      }
      const result = await driver.deleteProject(id);
      if (result.ok) {
        applyManifestUpdate(setState, result.value);
      }
      return result;
    },
    [driver, guardWrite],
  );

  const uploadAttachment = useCallback(
    async (projectId: string, file: File): Promise<Result<Manifest>> => {
      const blocked = guardWrite();
      if (blocked != null) {
        return blocked;
      }
      const result = await driver.uploadAttachment(projectId, file);
      if (result.ok) {
        applyManifestUpdate(setState, result.value);
      }
      return result;
    },
    [driver, guardWrite],
  );

  const removeAttachment = useCallback(
    async (projectId: string, fileId: string): Promise<Result<Manifest>> => {
      const blocked = guardWrite();
      if (blocked != null) {
        return blocked;
      }
      const result = await driver.removeAttachment(projectId, fileId);
      if (result.ok) {
        applyManifestUpdate(setState, result.value);
      }
      return result;
    },
    [driver, guardWrite],
  );

  const getAttachmentBlob = useCallback(
    async (projectId: string, fileId: string): Promise<Result<Blob>> => {
      return driver.getAttachmentBlob(projectId, fileId);
    },
    [driver],
  );

  const listUnlinkedDriveFiles = useCallback(async (): Promise<Result<UnlinkedDriveFile[]>> => {
    return driver.listUnlinkedDriveFiles();
  }, [driver]);

  const getDocAssessment = useCallback(
    (project: Project): DocAssessment => {
      return assessDocumentation(project, state.manifest?.property?.propertyType);
    },
    [state.manifest?.property?.propertyType],
  );

  const saveProperty = useCallback(
    async (property: PropertyProfile): Promise<Result<Manifest>> => {
      const blocked = guardWrite();
      if (blocked != null) {
        return blocked;
      }
      const result = await driver.saveProperty(property);
      if (result.ok) {
        applyManifestUpdate(setState, result.value);
      }
      return result;
    },
    [driver, guardWrite],
  );

  // Writes are disabled when offline OR when we're still waiting for the
  // fresh Drive manifest (etag is null — the driver's fileId isn't set yet).
  const isRevalidating = state.loading && state.manifest != null;

  const value: StorageContextValue = {
    ...state,
    reload: loadManifest,
    isViewingCachedData,
    writesDisabled: !isOnline || isRevalidating,
    addProject,
    addProjectWithAttachments,
    updateProject,
    deleteProject,
    uploadAttachment,
    removeAttachment,
    getAttachmentBlob,
    listUnlinkedDriveFiles,
    getDocAssessment,
    saveProperty,
    attachmentsFolderId: state.manifest?.settings?.attachmentsFolderId ?? null,
    attachmentsFolderName: ATTACHMENTS_ROOT_FOLDER_NAME,
  };

  return (
    <StorageContext.Provider value={value}>{children}</StorageContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStorage(): StorageContextValue {
  const context = useContext(StorageContext);
  if (!context) {
    throw new Error("useStorage must be used within a StorageProvider");
  }
  return context;
}
