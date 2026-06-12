# Capital Improvements & Tax Deduction Tracker

A **100% serverless, client-side Single Page Application (SPA)** for securely tracking
residential housing improvement records, extracting tax-relevant metrics from documents
with AI, and persisting structured records to the user's **personal Google Drive**.

There is no backend. No central proxy ever sees your tokens, your API key, or your
documents. All network requests go **directly from your browser to Google's endpoints**.

> **Status:** Planning / design only. No application code yet. See
> [`docs/high-level-design.md`](docs/high-level-design.md) for the full High-Level Design (HLD).

## Why this exists

Homeowners accumulate years of receipts and invoices for improvements. Some of these affect
taxes — most commonly by **increasing the cost basis** of the home (reducing capital-gains
tax at sale), and in narrower cases by qualifying for **deductions or credits** (e.g. energy
efficiency credits, medically necessary improvements, home-office allocation). The goal is a
durable, low-maintenance personal ledger that survives for ~20 years without any hosting bill.

## Core constraints

| Concern | Choice |
| --- | --- |
| Framework | React Router v7 (**SPA Mode**, static output — no SSR/Node runtime) |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix primitives) |
| Language | Strict TypeScript, **zero `any`** |
| Storage | User's Google Drive (`appDataFolder`) — fully serverless |
| Auth | Google Identity Services (GIS) client-side OAuth2 |
| AI | Google Gemini (`gemini-2.5-flash`) multimodal, **BYOK** |

## Documentation

- [High-Level Design](docs/high-level-design.md) — architecture, data model, flows, risks, roadmap.
- [Low-Level Design](docs/low-level-design.md) — granular handshaking: API calls, sequence diagrams, data contracts, retry/error model.

## License

TBD.
