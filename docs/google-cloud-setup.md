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

**Production site:** https://capital-improvements-tracker.pages.dev

> Whenever the hosting domain changes, come back and add the new origin here (LLD §5.4). A missing
> origin is the #1 cause of GIS sign-in failing with `idpiframe_initialization_failed` / origin
> mismatch errors.

---

## 5. Create & restrict the Gemini (BYOK) API key

The user supplies this key at runtime, but **you** create and lock it down.

### 5.1 Create the key (Google AI Studio)

1. Open **Google AI Studio**: <https://aistudio.google.com/app/apikey>
2. **Create API key** → select your Cloud project (`capital-improvements-tracker` or similar).
3. Copy the key value once — you will paste it in the app under **Settings → BYOK**.

> **Auth keys (2026 default):** New keys from AI Studio are **authorization (auth) keys**, bound to
> an auto-created service account (often named **"Gemini API Key"**). That is expected. Auth keys
> are already restricted to the **Gemini API** by default — you do **not** configure restrictions
> on the service account itself.

### 5.2 Confirm restrictions (Cloud Console)

Go to **APIs & Services → Credentials** (not IAM & Admin → Service accounts).

Under the **API Keys** section, click the **API key** row (shows a truncated value like
`AIza…`). You should land on an **Edit API key** page — not a service account with
*Details* / *Permissions* / *Keys* tabs.

If you instead see **IAM & Admin → Service accounts → Gemini API Key**, you opened the
**bound service account**, not the API key. Go back to **APIs & Services → Credentials** and
click the entry under **API Keys**.

On the **Edit API key** page:

1. **API restrictions:** confirm **Restrict key → Gemini API** only (auth keys default to this).
   Do not leave the key unrestricted.
2. **Application restrictions:** auth keys created via AI Studio are bound to a service account.
   The console will **not** let you set **Websites (HTTP referrers)** — you may see:
   *"This option is not available for API keys authenticated through a service account."*
   Leave **None** (or whatever is allowed). This is expected for auth keys as of 2026.
3. Click **Save** if you changed anything.

**What you still get with an auth key (without referrers):**

- Restricted to **Gemini API** only (not Maps, Firebase, etc.).
- Google's **leaked-key enforcement** on auth keys ([Gemini API key docs](https://ai.google.dev/gemini-api/docs/api-key)).
- **Tier limits** in §6 (Free tier is already capped by Google).
- **App-level guards** in LLD §13 (per-gesture budgets, circuit breakers, key expiry in Settings).

> **Legacy standard keys:** Older "standard" API keys could use HTTP referrer restrictions, but
> Google is deprecating them (unrestricted standard keys blocked June 2026; all standard keys
> September 2026). New AI Studio keys are auth keys — prefer them despite the referrer limitation.

> **Do not** create or download a JSON key under the service account's **Keys** tab — that is for
> server-side service-account auth, not this browser BYOK flow.

### 5.3 Use the key in the app

Enter the key in **Settings → BYOK** (stored in `localStorage`, or session-only).

---

## 6. Set quota caps (runaway-usage backstop)

This complements LLD §13's client-side guards. For Gemini, Google's **tier limits are the ceiling** —
you generally **cannot lower** RPM/RPD in Cloud Console the way older runbooks implied.

### 6.1 Gemini API — view limits (AI Studio, primary)

Rate limits are **per project** (not per API key), tier-based, and model-specific (RPM, TPM, RPD).
Google sets them; they update when your usage tier changes. You **view** them here — you do not
lower them manually on the Free tier.

1. Open **Google AI Studio**: <https://aistudio.google.com/>
2. Confirm the correct project is selected (project picker, top-left).
3. **Usage & rate limits:**
   - Left nav → **Dashboard** → **Usage** — current consumption vs limits ([billing docs](https://ai.google.dev/gemini-api/docs/billing)).
   - Or use the **rate limits** dashboard in AI Studio (RPM, TPM, RPD per model) if shown in your
     project's sidebar/settings — Google has been rolling this into the Usage area.
4. **Your tier:** left nav → **Projects** (or **API keys** page) → **Billing tier** column shows
   Free / Tier 1 / 2 / 3 for the selected project.
5. Reference: [Gemini API rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) for tier
   qualifications and model-specific caps.

**Free tier — you're done.** Limits are already conservative (e.g. ~10–15 RPM and ~1,000–1,500
RPD per Flash model). That is your provider-side backstop; no Cloud Console edit required.

**Paid tier only — optional spend cap in AI Studio:**

1. AI Studio → **Spend** (or project billing settings).
2. Set **Monthly spend cap** to a dollar limit you are comfortable with (~10 minute delay before
   enforcement; see [Google's spend caps announcement](https://blog.google/innovation-and-ai/technology/developers-tools/more-control-over-gemini-api-costs/)).

> **Edit Quotas in Cloud Console** (§6.2) is mainly for requesting **increases**, not lowering caps.

### 6.2 Gemini API — optional Cloud Console view (inspect only)

Skip this on Free tier unless you are curious. You generally **cannot** lower Gemini quotas here.

1. Open **IAM & Admin → Quotas & System Limits**:
   <https://console.cloud.google.com/iam-admin/quotas>
2. In **Filter**, set **Service** to **Gemini API** (or search `generativelanguage.googleapis.com`
   if that label appears instead).
3. Scan rows for metrics like `generate_content_*` (requests/tokens per minute or per day).

**Alternative path:** **APIs & Services → Enabled APIs & services** → click **Gemini API** →
**Quotas & system limits** tab (if present for your project).

If a row shows **Edit quotas**, that submits a request to Google — almost always to **raise** a
limit, not lower it. Free-tier rows are often read-only or show a fixed min/max range.

### 6.3 Optional billing guardrail (Cloud Console, paid tier)

If you linked a billing account for higher Gemini limits **and** want a second spend alert outside
AI Studio's monthly spend cap (§6.1):

1. **Billing → Budgets & alerts** → **Create budget**.
2. Scope it to your project; set a low monthly amount + email notification thresholds.
3. Keep the project on the **lowest tier** you need — tier upgrades are automatic as spend grows.

### 6.4 Drive API — no manual quota change

Drive enforces its own per-user rate limits automatically; the app cooperates with
`429` / `403 rateLimitExceeded` via backoff (LLD §1.5). No manual quota edit needed.

### 6.5 What actually protects you (summary)

| Layer | Gemini | Drive |
| --- | --- | --- |
| Provider | Tier RPM/RPD/TPM (Free tier is already low) | Per-user rate limits |
| Cloud Console | View quotas; budget alerts if billed | N/A |
| App (LLD §13) | Per-gesture budgets, circuit breakers, daily caps | Retry/backoff |

---

## 7. Verification checklist

- [ ] Project created and selected.
- [ ] Drive API enabled.
- [ ] Gemini API enabled.
- [ ] Consent screen: External, Testing; wizard completed (App info → Audience → Contact → Finish).
- [ ] Consent scopes = `drive.appdata` + `drive.file` only (added under Data Access after wizard).
- [ ] Test user(s) added under Audience.
- [ ] Web OAuth Client ID created; JS origins include `http://localhost:5173`, `https://capital-improvements-tracker.pages.dev` (+ custom domain later); redirect URIs empty.
- [ ] `VITE_GOOGLE_CLIENT_ID` set in Cloudflare Pages env vars; production smoke test at https://capital-improvements-tracker.pages.dev
- [ ] Gemini auth key created in AI Studio; **Gemini API** restriction confirmed on **APIs & Services → Credentials → API key** (HTTP referrers N/A for auth keys).
- [ ] Gemini rate limits reviewed in **AI Studio** (Free tier limits are the provider backstop; Cloud Console quotas are view-only / increase-request for most users).
- [ ] (Optional, paid tier) Billing budget + alert configured.
- [ ] Smoke test: sign in, manifest bootstraps in Drive, a sample receipt extracts via Gemini.

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Sign-in popup errors with origin mismatch | hosting origin not in Authorized JS origins | add the exact `scheme://host` (no path) in §4 |
| `access_denied` on consent | account not a test user (Testing mode) | add it under OAuth consent screen → Audience → Test users |
| Drive calls return `403 insufficientPermissions` | missing/partial scope grant | re-consent; verify both scopes in §3 |
| Gemini `400 API_KEY_INVALID` | wrong/rotated key | re-create key in AI Studio; update Settings |
| Gemini `403 requests blocked` | legacy standard key with referrer mismatch | auth keys cannot use referrers; remove referrer restrictions or migrate to auth key |
| Opened service account instead of API key | clicked **Gemini API Key** under IAM → Service accounts | use **APIs & Services → Credentials → API Keys** → click the `AIza…` key row |
| Websites restriction greyed out on auth key | auth key bound to service account (2026 default) | expected — confirm Gemini API restriction only; use quotas + app guards (§6, LLD §13) |
| Gemini `429 RESOURCE_EXHAUSTED` | quota hit | wait for reset / raise quota; client backs off automatically |

---

*Companion runbook. Update the origins/referrers lists whenever the hosting domain changes.*
