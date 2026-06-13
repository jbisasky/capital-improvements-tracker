import { type ReactElement } from "react";

export function SettingsPage(): ReactElement {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="text-muted-foreground">
        BYOK key management, property profile, key expiry, theme, and clear-data
        controls will appear here.
      </p>
    </div>
  );
}
