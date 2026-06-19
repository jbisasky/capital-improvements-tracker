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
- **Drive API** and **Gemini API** enabled.
- An **OAuth consent screen** (External, in Testing) requesting `drive.appdata` + `drive.file`.
- An **OAuth 2.0 Web Client ID** with your hosting domains as Authorized JavaScript origins.
- A **Gemini API key** (BYOK) — restricted to the Gemini API + your domain, with
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
2. **Gemini API** (formerly "Generative Language API"; same library entry) —
   <https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com>

   You do **not** need the **Vertex AI API**. This app calls the Gemini API directly from the
   browser with a BYOK key (`generativelanguage.googleapis.com`). Vertex AI is a separate
   server-side product that would require a backend and service account — see
   [HLD §2](high-level-design.md#2-architecture-overview) (no first-party backend).

---

## 3. Configure the OAuth consent screen

APIs & Services → **OAuth consent screen** → **Get started** (or **Create** if none exists).

The console walks you through a four-step wizard:

### Step 1 — App Information

1. **App name:** e.g. `Capital Improvements Tracker` (or your project name).
2. **User support email:** select your email from the dropdown — shown to users who have
   questions about consent.
3. Click **Next**.

### Step 2 — Audience

1. Select **External** — available to any Google Account user you add as a test user.
   (Choose **Internal** only if you are in a Google Workspace org and want org-only access.)
2. Click **Next**.

   External puts the app in **Testing mode** by default — fine for personal use; see notes
   below.

### Step 3 — Contact Information

1. **Email addresses:** add at least one address (e.g. your own) — Google uses this to notify
   you about changes to the project.
2. Click **Next**.

### Step 4 — Finish

1. Check **I agree to the Google API Services: User Data Policy**.
2. Click **Continue**, then **Create**.

### After the wizard — scopes and test users

The wizard does **not** add OAuth scopes. On the OAuth consent screen overview page:

1. **Scopes** — open **Data Access** (or **Edit app** → **Scopes**) → **Add or remove scopes**
   and add exactly:
   - `https://www.googleapis.com/auth/drive.appdata`
   - `https://www.googleapis.com/auth/drive.file`

   Do **not** add full `https://www.googleapis.com/auth/drive` (over-permissioned; triggers
   restricted-scope verification).

2. **Test users** — open **Audience** → **Test users** → add your own Google account(s).
   Required while the app is in Testing mode.

3. **Publishing status: leave in "Testing".**
   - For personal use, Testing mode avoids Google's app-verification process.
   - The 7-day refresh-token expiry of Testing mode is **irrelevant here** because the app uses
     the GIS **token model** (no refresh tokens) — see LLD §4. Access tokens still work normally.
   - Only **Publish app** if you intend others to use it; that may require verification for the
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

Put it in the app's build config:

```bash
# Local dev: copy the template, then edit .env (gitignored)
cp .env.example .env

# .env — the Client ID is public, but keep real values out of git
VITE_GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
```

For production (Cloudflare Pages), set `VITE_GOOGLE_CLIENT_ID` as a build-time environment
variable in the project settings — do not commit a `.env` file.

> Whenever the hosting domain changes, come back and add the new origin here (LLD §5.4). A missing
> origin is the #1 cause of GIS sign-in failing with `idpiframe_initialization_failed` / origin
> mismatch errors.

---

## 5. Create & restrict the Gemini (BYOK) API key

The user supplies this key at runtime, but **you** create and lock it down.

1. Get the key from **Google AI Studio**: <https://aistudio.google.com/app/apikey> → **Create API
   key** → select your project. (This is the same project, so quotas apply.)
2. Lock it down in Cloud Console → APIs & Services → **Credentials** → click the key:
   - **API restrictions:** **Restrict key** → allow **only** the **Gemini API** (may still
     appear as "Generative Language API" in older console UI).
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

1. IAM & Admin → **Quotas** (or APIs & Services → **Gemini API → Quotas & limits**):
   <https://console.cloud.google.com/iam-admin/quotas>
2. Filter to **Gemini API**. Review/lower the per-minute and per-day request limits
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
- [ ] Gemini API enabled.
- [ ] Consent screen: External, Testing; wizard completed (App info → Audience → Contact → Finish).
- [ ] Consent scopes = `drive.appdata` + `drive.file` only (added under Data Access after wizard).
- [ ] Test user(s) added under Audience.
- [ ] Web OAuth Client ID created; JS origins include dev + `pages.dev` (+ custom domain later);
      redirect URIs empty.
- [ ] `GOOGLE_CLIENT_ID` wired into the app build config.
- [ ] Gemini key created in AI Studio; restricted to Gemini API + HTTP referrers.
- [ ] Quota caps reviewed/lowered; (optional) billing budget alert set.
- [ ] Smoke test: sign in, manifest bootstraps in Drive, a sample receipt extracts via Gemini.

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Sign-in popup errors with origin mismatch | hosting origin not in Authorized JS origins | add the exact `scheme://host` (no path) in §4 |
| `access_denied` on consent | account not a test user (Testing mode) | add it under OAuth consent screen → Audience → Test users |
| Drive calls return `403 insufficientPermissions` | missing/partial scope grant | re-consent; verify both scopes in §3 |
| Gemini `400 API_KEY_INVALID` | wrong/rotated key | re-create key in AI Studio; update Settings |
| Gemini `403 requests blocked` | referrer restriction mismatch | ensure your domain is in the key's HTTP referrers |
| Gemini `429 RESOURCE_EXHAUSTED` | quota hit | wait for reset / raise quota; client backs off automatically |

---

*Companion runbook. Update the origins/referrers lists whenever the hosting domain changes.*
