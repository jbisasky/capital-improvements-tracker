import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactElement,
  type ReactNode,
} from "react";
import { type Manifest, type Project } from "@/domain/schemas";
import { type DocAssessment, assessDocumentation } from "@/domain/doc-completeness";
import {
  type StorageDriver,
  type ManifestReadResult,
  type UnlinkedDriveFile,
} from "@/services/storage-driver";
import { type Result } from "@/domain/result";
import { ATTACHMENTS_ROOT_FOLDER_NAME } from "@/services/drive-attachment";

interface StorageState {
  manifest: Manifest | null;
  etag: string | null;
  loading: boolean;
  error: string | null;
}

interface StorageContextValue extends StorageState {
  reload: () => Promise<void>;
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
  const [state, setState] = useState<StorageState>({
    manifest: null,
    etag: null,
    loading: true,
    error: null,
  });

  const loadManifest = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const result: Result<ManifestReadResult> = await driver.readManifest();
    if (result.ok) {
      setState({
        manifest: result.value.manifest,
        etag: result.value.etag,
        loading: false,
        error: null,
      });
    } else {
      setState({
        manifest: null,
        etag: null,
        loading: false,
        error: result.error.message,
      });
    }
  }, [driver]);

  const initialized = useRef<boolean | null>(null);
  if (initialized.current == null) {
    initialized.current = true;
    void loadManifest();
  }

  const addProject = useCallback(
    async (project: Project): Promise<Result<Manifest>> => {
      const result = await driver.addProject(project);
      if (result.ok) {
        applyManifestUpdate(setState, result.value);
      }
      return result;
    },
    [driver],
  );

  const addProjectWithAttachments = useCallback(
    async (project: Project, files: File[]): Promise<Result<Manifest>> => {
      const result = await driver.addProjectWithAttachments(project, files);
      if (result.ok) {
        applyManifestUpdate(setState, result.value);
      }
      return result;
    },
    [driver],
  );

  const updateProject = useCallback(
    async (id: string, project: Project): Promise<Result<Manifest>> => {
      const result = await driver.updateProject(id, project);
      if (result.ok) {
        applyManifestUpdate(setState, result.value);
      }
      return result;
    },
    [driver],
  );

  const deleteProject = useCallback(
    async (id: string): Promise<Result<Manifest>> => {
      const result = await driver.deleteProject(id);
      if (result.ok) {
        applyManifestUpdate(setState, result.value);
      }
      return result;
    },
    [driver],
  );

  const uploadAttachment = useCallback(
    async (projectId: string, file: File): Promise<Result<Manifest>> => {
      const result = await driver.uploadAttachment(projectId, file);
      if (result.ok) {
        applyManifestUpdate(setState, result.value);
      }
      return result;
    },
    [driver],
  );

  const removeAttachment = useCallback(
    async (projectId: string, fileId: string): Promise<Result<Manifest>> => {
      const result = await driver.removeAttachment(projectId, fileId);
      if (result.ok) {
        applyManifestUpdate(setState, result.value);
      }
      return result;
    },
    [driver],
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

  const value: StorageContextValue = {
    ...state,
    reload: loadManifest,
    addProject,
    addProjectWithAttachments,
    updateProject,
    deleteProject,
    uploadAttachment,
    removeAttachment,
    getAttachmentBlob,
    listUnlinkedDriveFiles,
    getDocAssessment,
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
