# Google Cloud Setup Runbook

**Status:** Draft v0.1 — companion to the [HLD](high-level-design.md) and [LLD](low-level-design.md)
**Audience:** the app owner (one-time setup, plus a 20-year recovery reference)

This app is 100% client-side, but it still needs a small, **mandatory** Google Cloud footprint:
an OAuth Client ID (so users can sign in) and two enabled APIs (Drive + Gemini). It also relies
on **provider-side quota caps** and **API-key restrictions** as the authoritative backstop for
the runaway-usage failsafes in [LLD §13](low-level-design.md#13-runaway-usage-failsafes-apitoken-budget-protection).

> Keep this document current. If the Cloud project is ever lost, these steps recreate everything;
> the app's *data* is unaffected because it lives in your personal Google Drive, not in the project.

---

## 0. What you'll end up with

- A Google Cloud **project** (e.g. `capital-improvements-tracker`).
- **Drive API** and **Generative Language API** enabled.
- An **OAuth consent screen** (External, in Testing) requesting `drive.appdata` + `drive.file`.
- An **OAuth 2.0 Web Client ID** with your hosting domains as Authorized JavaScript origins.
- A **Gemini API key** (BYOK) — restricted to the Generative Language API + your domain, with
  conservative per-minute / per-day quota caps.

Two values feed the app:
- `GOOGLE_CLIENT_ID` — build-time config (public; safe to ship in the bundle).
- The **Gemini API key** — entered by the user at runtime in Settings (never committed/shipped).

---

## 1. Create the project

1. Go to <https://console.cloud.google.com/>.
2. Project dropdown → **New Project** → name it (e.g. `capital-improvements-tracker`) → **Create**.
3. Make sure the new project is selected (project picker, top bar).

---

## 2. Enable the required APIs

APIs & Services → **Enabled APIs & services** → **+ Enable APIs and Services**, then enable:

1. **Google Drive API** — <https://console.cloud.google.com/apis/library/drive.googleapis.com>
2. **Generative Language API** — <https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com>

(You do **not** need Vertex AI; that would require a backend/service account — see HLD §"GCP scope".)

---

## 3. Configure the OAuth consent screen

APIs & Services → **OAuth consent screen**.

1. **User type: External** → **Create**. (Internal is only for Google Workspace orgs.)
2. **App information:** app name (e.g. "Capital Improvements Tracker"), your support email, a
   developer contact email. A logo/homepage is optional while in Testing.
3. **Scopes:** **Add or remove scopes** and add exactly:
   - `https://www.googleapis.com/auth/drive.appdata`
   - `https://www.googleapis.com/auth/drive.file`
   Do **not** add full `https://www.googleapis.com/auth/drive` (over-permissioned; triggers
   restricted-scope verification).
4. **Test users:** add your own Google account(s). 
5. **Publishing status: leave in "Testing".**
   - For personal use, Testing mode avoids Google's app-verification process.
   - The 7-day refresh-token expiry of Testing mode is **irrelevant here** because the app uses
     the GIS **token model** (no refresh tokens) — see LLD §4. Access tokens still work normally.
   - Only "Publish" if you intend others to use it; that may require verification for the
     `drive.appdata` sensitive scope.

---

## 4. Create the OAuth 2.0 Web Client ID

APIs & Services → **Credentials** → **+ Create credentials** → **OAuth client ID**.

1. **Application type: Web application.**
2. **Name:** e.g. "Web SPA (Cloudflare Pages)".
3. **Authorized JavaScript origins** — add every origin the app is served from (scheme + host,
   **no path, no trailing slash**):
   - `http://localhost:5173` (or whatever the dev server uses) — for local development.
   - `https://capital-improvements-tracker.pages.dev` — the Cloudflare Pages URL.
   - `https://<your-custom-domain>` — later, if/when you add one.
4. **Authorized redirect URIs:** **leave empty.** The GIS token model
   (`google.accounts.oauth2.initTokenClient`) uses JavaScript origins, not redirect URIs.
5. **Create**, then copy the **Client ID** (looks like `xx….apps.googleusercontent.com`).

Put it in the app's build config (e.g. an env var `VITE_GOOGLE_CLIENT_ID` baked at build time):

```bash
# .env (build-time; the Client ID is public, but keep config centralized)
VITE_GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
```

> Whenever the hosting domain changes, come back and add the new origin here (LLD §5.4). A missing
> origin is the #1 cause of GIS sign-in failing with `idpiframe_initialization_failed` / origin
> mismatch errors.

---

## 5. Create & restrict the Gemini (BYOK) API key

The user supplies this key at runtime, but **you** create and lock it down.

1. Get the key from **Google AI Studio**: <https://aistudio.google.com/app/apikey> → **Create API
   key** → select your project. (This is the same project, so quotas apply.)
2. Lock it down in Cloud Console → APIs & Services → **Credentials** → click the key:
   - **API restrictions:** **Restrict key** → allow **only** the **Generative Language API**.
   - **Application restrictions:** **HTTP referrers (web sites)** → add:
     - `https://capital-improvements-tracker.pages.dev/*`
     - `https://<your-custom-domain>/*`
     - `http://localhost:5173/*` (dev)
   - Save. A referrer-locked key can't be used from anywhere but your app's domains, so a leaked
     key has limited blast radius.
3. Enter the key in the app: **Settings → BYOK** (stored in `localStorage`, or session-only).

---

## 6. Set quota caps (runaway-usage backstop)

This is the authoritative ceiling behind LLD §13's client guards — even a buggy build can't exceed
what Google allows.

1. IAM & Admin → **Quotas** (or APIs & Services → **Generative Language API → Quotas & limits**):
   <https://console.cloud.google.com/iam-admin/quotas>
2. Filter to **Generative Language API**. Review/lower the per-minute and per-day request limits
   (e.g. **Requests per minute**, **Requests per day**) to conservative values appropriate for a
   single user. The free tier already enforces caps; setting explicit lower limits adds headroom
   safety. (Some limits are editable; others are fixed by tier.)
3. **Optional billing guardrail:** if you ever attach billing for higher Gemini limits, set a
   **Budget & alert** (Billing → Budgets & alerts) with a low monthly cap + email alerts, so any
   runaway spend is caught quickly.
4. **Drive API** enforces its own per-user rate limits automatically; the app cooperates with
   `429` / `403 rateLimitExceeded` via backoff (LLD §1.5) — no manual quota change needed.

---

## 7. Verification checklist

- [ ] Project created and selected.
- [ ] Drive API enabled.
- [ ] Generative Language API enabled.
- [ ] Consent screen: External, Testing, your account added as a test user.
- [ ] Consent scopes = `drive.appdata` + `drive.file` only.
- [ ] Web OAuth Client ID created; JS origins include dev + `pages.dev` (+ custom domain later);
      redirect URIs empty.
- [ ] `GOOGLE_CLIENT_ID` wired into the app build config.
- [ ] Gemini key created in AI Studio; restricted to Generative Language API + HTTP referrers.
- [ ] Quota caps reviewed/lowered; (optional) billing budget alert set.
- [ ] Smoke test: sign in, manifest bootstraps in Drive, a sample receipt extracts via Gemini.

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Sign-in popup errors with origin mismatch | hosting origin not in Authorized JS origins | add the exact `scheme://host` (no path) in §4 |
| `access_denied` on consent | account not a test user (Testing mode) | add it under consent screen → Test users |
| Drive calls return `403 insufficientPermissions` | missing/partial scope grant | re-consent; verify both scopes in §3 |
| Gemini `400 API_KEY_INVALID` | wrong/rotated key | re-create key in AI Studio; update Settings |
| Gemini `403 requests blocked` | referrer restriction mismatch | ensure your domain is in the key's HTTP referrers |
| Gemini `429 RESOURCE_EXHAUSTED` | quota hit | wait for reset / raise quota; client backs off automatically |

---

*Companion runbook. Update the origins/referrers lists whenever the hosting domain changes.*
