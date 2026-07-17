import { type ReactElement, useRef, useState, useCallback } from "react";
import {
  Upload,
  FileText,
  Eye,
  Download,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { type Attachment } from "@/domain/schemas";
import {
  ACCEPTED_ATTACHMENT_ACCEPT,
  MAX_ATTACHMENTS_PER_PROJECT,
  validateAttachmentFile,
} from "@/domain/attachment-validation";
import { useStorage } from "@/services/storage-context";
import { cn } from "@/lib/utils";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type ItemStatus = "uploaded" | "uploading" | "failed" | "pending";

const ATTACHMENT_ACTION_CLASS =
  "h-10 flex-1 gap-1.5 px-3 text-sm sm:h-7 sm:flex-none sm:px-2.5 sm:text-[0.8rem]";

interface DisplayItem {
  key: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
  fileId?: string;
  file?: File;
  status: ItemStatus;
  error?: string;
}

export interface AttachmentSectionProps {
  projectId: string;
  attachments: Attachment[];
  /** Live upload to storage, or pending until parent saves (create flow). */
  mode: "live" | "pending";
  pendingFiles?: File[];
  onPendingFilesChange?: (files: File[]) => void;
  /** Extra pending file shown alongside pendingFiles (e.g. AI source on create). */
  includedPendingFile?: File | null;
  onIncludedPendingFileRemove?: () => void;
}

function formatKb(bytes: number): string {
  return `${String(Math.round(bytes / 1024))} KB`;
}

function attachmentToItem(att: Attachment): DisplayItem {
  return {
    key: att.fileId,
    filename: att.filename,
    sizeBytes: att.sizeBytes,
    mimeType: att.mimeType,
    fileId: att.fileId,
    status: "uploaded",
  };
}

function fileToPendingItem(file: File): DisplayItem {
  return {
    key: `pending:${file.name}:${String(file.size)}:${file.type}`,
    filename: file.name,
    sizeBytes: file.size,
    mimeType: file.type,
    file,
    status: "pending",
  };
}

export function AttachmentSection({
  projectId,
  attachments,
  mode,
  pendingFiles = [],
  onPendingFilesChange,
  includedPendingFile = null,
  onIncludedPendingFileRemove,
}: AttachmentSectionProps): ReactElement {
  const {
    uploadAttachment,
    removeAttachment,
    getAttachmentBlob,
  } = useStorage();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadingKeys, setUploadingKeys] = useState<Set<string>>(new Set());
  const [failedItems, setFailedItems] = useState<Map<string, string>>(new Map());
  const [removeTarget, setRemoveTarget] = useState<{ fileId: string; filename: string } | null>(
    null,
  );

  const totalCount =
    attachments.length
    + pendingFiles.length
    + (includedPendingFile != null ? 1 : 0);

  const atLimit = totalCount >= MAX_ATTACHMENTS_PER_PROJECT;

  const items: DisplayItem[] = [
    ...attachments.map(attachmentToItem),
    ...(includedPendingFile != null ? [fileToPendingItem(includedPendingFile)] : []),
    ...pendingFiles.map(fileToPendingItem),
  ];

  const addPendingFile = useCallback(
    (file: File): void => {
      if (onPendingFilesChange == null) return;
      const validation = validateAttachmentFile(file, totalCount);
      if (!validation.ok) {
        setFailedItems((prev) => {
          const next = new Map(prev);
          next.set(`err:${file.name}`, validation.error.message);
          return next;
        });
        return;
      }
      onPendingFilesChange([...pendingFiles, file]);
    },
    [onPendingFilesChange, pendingFiles, totalCount],
  );

  const handleSelectedFile = useCallback(
    (file: File | undefined): void => {
      if (file == null) return;

      if (mode === "pending") {
        addPendingFile(file);
        return;
      }

      const validation = validateAttachmentFile(file, attachments.length);
      if (!validation.ok) {
        setFailedItems((prev) => {
          const next = new Map(prev);
          next.set(`err:${file.name}`, validation.error.message);
          return next;
        });
        return;
      }

      const key = `uploading:${file.name}:${String(Date.now())}`;
      setUploadingKeys((prev) => new Set(prev).add(key));

      void uploadAttachment(projectId, file).then((result) => {
        setUploadingKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        if (!result.ok) {
          setFailedItems((prev) => {
            const next = new Map(prev);
            next.set(key, result.error.message);
            return next;
          });
        }
      });
    },
    [addPendingFile, attachments.length, mode, projectId, uploadAttachment],
  );

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    handleSelectedFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent): void {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleSelectedFile(file);
  }

  async function handleView(fileId: string, mimeType: string): Promise<void> {
    const result = await getAttachmentBlob(projectId, fileId);
    if (!result.ok) return;
    const url = URL.createObjectURL(new Blob([result.value], { type: mimeType }));
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60_000);
  }

  async function handleDownload(
    fileId: string,
    filename: string,
    mimeType: string,
  ): Promise<void> {
    const result = await getAttachmentBlob(projectId, fileId);
    if (!result.ok) return;
    const url = URL.createObjectURL(new Blob([result.value], { type: mimeType }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handleRemovePending(file: File): void {
    if (onPendingFilesChange == null) return;
    onPendingFilesChange(
      pendingFiles.filter(
        (f) => !(f.name === file.name && f.size === file.size && f.type === file.type),
      ),
    );
  }

  function handleRemoveUploaded(fileId: string): void {
    if (mode !== "live") return;
    void removeAttachment(projectId, fileId);
  }

  function confirmRemoveUploaded(fileId: string, filename: string): void {
    setRemoveTarget({ fileId, filename });
  }

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h2 className="text-sm font-medium">
        Attachments ({totalCount})
      </h2>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => { setDragOver(false); }}
        onDrop={handleDrop}
        className={cn(
          "rounded-md border border-dashed p-4 transition-colors",
          dragOver && "border-primary bg-primary/5",
        )}
      >
        {dragOver ? (
          <p className="text-center text-sm text-primary">Drop here</p>
        ) : (
          <>
            <p className="text-center text-sm text-muted-foreground">
              {items.length === 0
                ? "Upload a receipt or invoice"
                : "Drag and drop or tap the button below"}
            </p>
            <p className="mt-1 text-center text-xs text-muted-foreground/70">
              Receipts, invoices, and permits only
            </p>
          </>
        )}

        <div className="mt-3 flex justify-center">
          <Button
            type="button"
            variant="outline"
            disabled={atLimit}
            onClick={() => { fileInputRef.current?.click(); }}
            title={atLimit ? `Maximum ${String(MAX_ATTACHMENTS_PER_PROJECT)} attachments` : undefined}
            className="h-11 w-full max-w-sm gap-2 text-sm sm:h-8 sm:w-auto sm:max-w-none"
          >
            <Upload className="size-4" />
            Upload receipt or photo
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_ATTACHMENT_ACCEPT}
          onChange={handleInputChange}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {uploadingKeys.size > 0 && (
        <p className="text-sm text-muted-foreground">Uploading…</p>
      )}

      {[...failedItems.entries()].map(([key, message]) => (
        <div key={key} className="flex items-center gap-2 text-sm text-red-600">
          <span>{message}</span>
          <button
            type="button"
            onClick={() => {
              setFailedItems((prev) => {
                const next = new Map(prev);
                next.delete(key);
                return next;
              });
            }}
            className="inline-flex cursor-pointer items-center gap-1 underline"
          >
            <RotateCcw className="size-3" /> Dismiss
          </button>
        </div>
      ))}

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex flex-wrap items-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm"
            >
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <span className="font-medium">{item.filename}</span>
              <span className="text-xs text-muted-foreground">
                ({formatKb(item.sizeBytes)})
              </span>
              {item.status === "pending" && (
                <span className="text-xs text-muted-foreground">· saves on create</span>
              )}
              {item.fileId != null && mode === "live" && (
                <span className="flex w-full basis-full gap-2 sm:ml-auto sm:w-auto sm:basis-auto sm:flex-nowrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={ATTACHMENT_ACTION_CLASS}
                    onClick={() => {
                      void handleView(item.fileId ?? "", item.mimeType);
                    }}
                  >
                    <Eye className="size-3.5 sm:size-3" /> View
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={ATTACHMENT_ACTION_CLASS}
                    onClick={() => {
                      void handleDownload(item.fileId ?? "", item.filename, item.mimeType);
                    }}
                  >
                    <Download className="size-3.5 sm:size-3" /> Download
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className={ATTACHMENT_ACTION_CLASS}
                    onClick={() => { confirmRemoveUploaded(item.fileId ?? "", item.filename); }}
                  >
                    <Trash2 className="size-3.5 sm:size-3" /> Remove
                  </Button>
                </span>
              )}
              {item.file != null && item.status === "pending" && (
                <button
                  type="button"
                  onClick={() => {
                    if (
                      includedPendingFile != null
                      && item.file?.name === includedPendingFile.name
                      && item.file.size === includedPendingFile.size
                    ) {
                      onIncludedPendingFileRemove?.();
                    } else if (item.file != null) {
                      handleRemovePending(item.file);
                    }
                  }}
                  className="ml-auto inline-flex items-center gap-1 rounded border border-red-200 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="size-3" /> Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <AlertDialog
        open={removeTarget != null}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveTarget(null);
          }
        }}
        title="Remove attachment?"
        description={
          removeTarget != null
            ? `"${removeTarget.filename}" will be removed from this project and moved to your Google Drive trash.`
            : ""
        }
        confirmLabel="Remove attachment"
        onConfirm={() => {
          if (removeTarget != null) {
            handleRemoveUploaded(removeTarget.fileId);
          }
        }}
      />
    </section>
  );
}
