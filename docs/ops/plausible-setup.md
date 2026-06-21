# Plausible Analytics setup

**Production domain:** `capital-improvements-tracker.pages.dev`

The app injects Plausible at build time when `VITE_PLAUSIBLE_DOMAIN` is set on Cloudflare Pages.
Custom events are sent via [`src/services/analytics.ts`](../../src/services/analytics.ts).

## One-time Plausible dashboard steps

1. Sign in at [plausible.io](https://plausible.io/).
2. **Add site** → enter `capital-improvements-tracker.pages.dev` (no `https://`).
3. Confirm the snippet matches what production serves (View Source → `plausible.io/js/script.js` with matching `data-domain`).
4. Visit the live site and check **Plausible → realtime** for a page view within ~30 seconds.

## Custom events tracked

| Event | Trigger |
| --- | --- |
| Demo CTA Clicked | "See a demo" on landing |
| Sign In | Google sign-in click |
| Project Created / Edited | CRUD flows |
| AI Extraction Started / Accepted | Receipt scan |
| Export | JSON/CSV download |
| BYOK Key Saved | Settings |
| Clear All Data | Settings danger zone |

## If you add a custom domain later

Update `VITE_PLAUSIBLE_DOMAIN` on Cloudflare, redeploy, and add the new domain as a separate site (or primary) in Plausible.
