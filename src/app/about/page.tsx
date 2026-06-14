import { type ReactElement } from "react";
import { version } from "../../../package.json";

export function AboutPage(): ReactElement {
  return (
    <div className="mx-auto max-w-2xl space-y-12 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">About</h1>
        <p className="text-muted-foreground">Version {version}</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Privacy & Data Storage</h2>
        <div className="space-y-3 text-muted-foreground">
          <p>
            Your data lives in your Google Drive. This app has no server.
          </p>
          <p>
            When you sign in, the app connects directly to your Google Drive to store and retrieve your records.
            All files and data stay strictly within your account.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Disclaimer</h2>
        <div className="rounded-lg border border-border bg-muted/50 p-4">
          <p className="text-sm font-medium text-foreground">
            Not tax advice — for recordkeeping only. Confirm treatment with a qualified professional.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            The tax classifications and rules provided within this application are for informational purposes only
            and do not constitute tax, legal, or accounting advice. Always consult with a certified tax professional
            regarding your specific situation before making any tax-related decisions or filings.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Documentation</h2>
        <ul className="list-inside list-disc space-y-2 text-muted-foreground">
          <li>
            <a
              href="https://github.com/your-org/capital-improvements-tracker/blob/main/docs/high-level-design.md"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              High-Level Design (HLD)
            </a>
          </li>
          <li>
            <a
              href="https://github.com/your-org/capital-improvements-tracker/blob/main/docs/low-level-design.md"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              Low-Level Design (LLD)
            </a>
          </li>
          <li>
            <a
              href="https://github.com/your-org/capital-improvements-tracker/blob/main/docs/google-cloud-setup.md"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              Google Cloud Setup Guide
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
