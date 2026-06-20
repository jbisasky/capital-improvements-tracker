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
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-accent disabled:opacity-50"
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
      </div>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${String(file.size)}-${String(file.lastModified)}`}
              className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm"
            >
              <span className="min-w-0 flex-1 truncate font-medium">{file.name}</span>
              {showExtract && files.length > 1 && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {String(index + 1)}/{String(files.length)}
                </span>
              )}
              <span className="shrink-0 text-muted-foreground">
                ({String(Math.round(file.size / 1024))} KB)
              </span>
              <button
                type="button"
                onClick={() => { handleRemove(index); }}
                className="rounded p-1 hover:bg-accent"
                title="Remove"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {showExtract && files.length > 0 && keyConfigured && onExtract != null && (
        <button
          type="button"
          onClick={onExtract}
          disabled={extracting}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
        >
          <Sparkles className="size-4" />
          {extractLabel ?? (extracting ? "Extracting…" : "Extract details with AI")}
        </button>
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
