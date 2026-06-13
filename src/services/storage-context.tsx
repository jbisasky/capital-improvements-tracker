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
import { type StorageDriver, type ManifestReadResult } from "@/services/storage-driver";
import { type Result } from "@/domain/result";

interface StorageState {
  manifest: Manifest | null;
  etag: string | null;
  loading: boolean;
  error: string | null;
}

interface StorageContextValue extends StorageState {
  reload: () => Promise<void>;
  addProject: (project: Project) => Promise<Result<Manifest>>;
  updateProject: (id: string, project: Project) => Promise<Result<Manifest>>;
  deleteProject: (id: string) => Promise<Result<Manifest>>;
  getDocAssessment: (project: Project) => DocAssessment;
}

const StorageContext = createContext<StorageContextValue | null>(null);

interface StorageProviderProps {
  driver: StorageDriver;
  children: ReactNode;
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
        setState((prev) => ({
          ...prev,
          manifest: result.value,
        }));
      }
      return result;
    },
    [driver],
  );

  const updateProject = useCallback(
    async (id: string, project: Project): Promise<Result<Manifest>> => {
      const result = await driver.updateProject(id, project);
      if (result.ok) {
        setState((prev) => ({
          ...prev,
          manifest: result.value,
        }));
      }
      return result;
    },
    [driver],
  );

  const deleteProject = useCallback(
    async (id: string): Promise<Result<Manifest>> => {
      const result = await driver.deleteProject(id);
      if (result.ok) {
        setState((prev) => ({
          ...prev,
          manifest: result.value,
        }));
      }
      return result;
    },
    [driver],
  );

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
    updateProject,
    deleteProject,
    getDocAssessment,
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
