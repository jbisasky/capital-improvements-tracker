import { type ReactElement, useEffect, useState } from "react";
import { Link } from "react-router";
import { useStorage } from "@/services/storage-context";
import { useRoutePrefix } from "@/hooks/use-route-prefix";

export function DiagnosticsPage(): ReactElement {
  const prefix = useRoutePrefix();
  const {
    attachmentsFolderId,
    attachmentsFolderName,
    listUnlinkedDriveFiles,
    loading,
  } = useStorage();
  const [unlinked, setUnlinked] = useState<{ fileId: string; name: string }[]>([]);
  const [unlinkedError, setUnlinkedError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    void listUnlinkedDriveFiles().then((result) => {
      if (result.ok) {
        setUnlinked(result.value);
        setUnlinkedError(null);
      } else {
        setUnlinkedError(result.error.message);
      }
    });
  }, [loading, listUnlinkedDriveFiles, attachmentsFolderId]);

  return (
    <div className="space-y-6">
      <Link
        to={`${prefix}/settings`}
        className="text-sm text-primary hover:underline"
      >
        ← Back to Settings
      </Link>
      <h1 className="text-2xl font-semibold">Diagnostics</h1>

      <div className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Drive layout</h2>
        <dl className="grid gap-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Manifest (hidden)</dt>
            <dd>appDataFolder / manifest.json</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Attachments root</dt>
            <dd>{attachmentsFolderName}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Per-project folders</dt>
            <dd>{`{Project title} - {date}/`}</dd>
          </div>
          {attachmentsFolderId != null && (
            <div>
              <dt className="text-xs text-muted-foreground">Folder link</dt>
              <dd>
                <a
                  href={`https://drive.google.com/drive/folders/${attachmentsFolderId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Open in Google Drive
                </a>
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Unlinked files in attachments root</h2>
        <p className="text-sm text-muted-foreground">
          Files sitting directly in the root folder that are not referenced by any project in
          your manifest (e.g. from an interrupted upload).
        </p>
        {unlinkedError != null && (
          <p className="text-sm text-red-600">{unlinkedError}</p>
        )}
        {unlinked.length === 0 && unlinkedError == null && (
          <p className="text-sm text-muted-foreground">None detected.</p>
        )}
        {unlinked.length > 0 && (
          <ul className="space-y-1 text-sm">
            {unlinked.map((file) => (
              <li key={file.fileId} className="font-mono text-xs">
                {file.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Ring-buffer log viewer with redacted copy-to-clipboard will appear here.
      </p>
    </div>
  );
}
