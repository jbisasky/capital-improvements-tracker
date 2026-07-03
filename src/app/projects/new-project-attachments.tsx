import { type ReactElement, useRef, useState } from "react";
import { Link } from "react-router";
import { Sparkles, Upload, X } from "lucide-react";
import {
  ACCEPTED_ATTACHMENT_TYPES,
  MAX_ATTACHMENTS_PER_PROJECT,
  addPendingAttachmentFiles,
} from "@/domain/attachment-validation";

interface NewProjectAttachmentsProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  onValidationError: (message: string) => void;
  showExtract?: boolean;
  extracting?: boolean;
  extractLabel?: string;
  keyConfigured?: boolean;
  settingsHref?: string;
  onExtract?: () => void;
  excludedIndices?: Set<number>;
  onToggleExclude?: (index: number) => void;
}

export function NewProjectAttachments({
  files,
  onFilesChange,
  onValidationError,
  showExtract = false,
  extracting = false,
  extractLabel,
  keyConfigured = false,
  settingsHref,
  onExtract,
  excludedIndices,
  onToggleExclude,
}: NewProjectAttachmentsProps): ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function addFiles(incoming: FileList | File[]): void {
    const result = addPendingAttachmentFiles(files, Array.from(incoming));
    if (!result.ok) {
      onValidationError(result.error.message);
      return;
    }
    onValidationError("");
    onFilesChange(result.value);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>): void {
    if (e.target.files != null) {
      addFiles(e.target.files);
    }
    e.target.value = "";
  }

  function handleRemove(index: number): void {
    onFilesChange(files.filter((_, i) => i !== index));
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    setDragOver(false);
    if (files.length >= MAX_ATTACHMENTS_PER_PROJECT) return;
    addFiles(e.dataTransfer.files);
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <h3 className="text-sm font-medium">Attachments</h3>
      <p className="text-sm text-muted-foreground">
        Add one or more receipts or invoices (up to {MAX_ATTACHMENTS_PER_PROJECT}). All selected
        files are saved with the project. AI reads all listed files together and suggests project
        details for you to review.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (files.length < MAX_ATTACHMENTS_PER_PROJECT) setDragOver(true);
        }}
        onDragLeave={() => { setDragOver(false); }}
        onDrop={handleDrop}
        className={`rounded-md border border-dashed p-4 transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30"
        }`}
      >
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => { fileInputRef.current?.click(); }}
            disabled={files.length >= MAX_ATTACHMENTS_PER_PROJECT}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload className="size-4" />
            {files.length === 0 ? "Upload files" : "Add more files"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_ATTACHMENT_TYPES.join(",")}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Drag and drop supported · {files.length}/{MAX_ATTACHMENTS_PER_PROJECT} selected
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Receipts, invoices, and permits only
        </p>
      </div>

      {files.length > 0 && (
        <>
          {showExtract && (
            <p className="text-xs text-muted-foreground">
              Check files to include in AI extraction. Uncheck any file you prefer not to send to Google (e.g. bank statements with account numbers).
            </p>
          )}
          <ul className="space-y-2">
            {files.map((file, index) => {
              const included = !(excludedIndices?.has(index) ?? false);
              return (
                <li
                  key={`${file.name}-${String(file.size)}-${String(file.lastModified)}`}
                  className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm"
                >
                  {showExtract && (
                    <input
                      type="checkbox"
                      checked={included}
                      onChange={() => { onToggleExclude?.(index); }}
                      title={included ? "Exclude from AI extraction" : "Include in AI extraction"}
                      className="shrink-0 cursor-pointer"
                    />
                  )}
                  <span className={`min-w-0 flex-1 truncate font-medium ${!included && showExtract ? "text-muted-foreground line-through" : ""}`}>
                    {file.name}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    ({String(Math.round(file.size / 1024))} KB)
                  </span>
                  <button
                    type="button"
                    onClick={() => { handleRemove(index); }}
                    className="cursor-pointer rounded p-1 hover:bg-accent"
                    title="Remove"
                  >
                    <X className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {showExtract && files.length > 0 && keyConfigured && onExtract != null && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={onExtract}
            disabled={extracting}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles className="size-4" />
            {extractLabel ?? (extracting ? "Extracting…" : "Extract details with AI")}
          </button>
          <p className="text-xs text-muted-foreground/70">
            Checked files are sent to Google&apos;s Gemini API for processing. Avoid including documents with bank account numbers or SSNs.
          </p>
        </div>
      )}

      {showExtract && files.length > 0 && !keyConfigured && settingsHref != null && (
        <p className="text-sm text-yellow-600">
          Add your Gemini API key in{" "}
          <Link to={settingsHref} className="underline">Settings</Link>{" "}
          to enable AI extraction.
        </p>
      )}
    </div>
  );
}
