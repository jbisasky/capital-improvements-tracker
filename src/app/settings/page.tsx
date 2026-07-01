import { type ReactElement, useState, useEffect } from "react";
import { Link } from "react-router";
import { useStorage } from "@/services/storage-context";
import { type PropertyType } from "@/domain/schemas";
import { useRoutePrefix } from "@/hooks/use-route-prefix";
import { useAuth } from "@/services/auth-context";
import { clearLocalDeviceData } from "@/services/clear-local-data";
import { trackClearAllData, trackBYOKKeySaved } from "@/services/analytics";
import {
  getGeminiKey,
  saveGeminiKey,
  clearGeminiKey,
  getKeyExpiry,
  isSessionOnly,
  type ExpiryDays,
} from "@/services/gemini-key";
import {
  getBudgetSettings,
  saveBudgetSettings,
  getUsageCounters,
  type UsageBudget,
} from "@/services/ai-budget";
import { testGeminiKey } from "@/services/gemini";
import { useTheme } from "@/services/theme-context";
import { type ThemePreference } from "@/services/theme";
import { Sun, Moon, Monitor } from "lucide-react";

const US_STATES: { abbr: string; name: string }[] = [
  { abbr: "AL", name: "Alabama" },
  { abbr: "AK", name: "Alaska" },
  { abbr: "AZ", name: "Arizona" },
  { abbr: "AR", name: "Arkansas" },
  { abbr: "CA", name: "California" },
  { abbr: "CO", name: "Colorado" },
  { abbr: "CT", name: "Connecticut" },
  { abbr: "DE", name: "Delaware" },
  { abbr: "FL", name: "Florida" },
  { abbr: "GA", name: "Georgia" },
  { abbr: "HI", name: "Hawaii" },
  { abbr: "ID", name: "Idaho" },
  { abbr: "IL", name: "Illinois" },
  { abbr: "IN", name: "Indiana" },
  { abbr: "IA", name: "Iowa" },
  { abbr: "KS", name: "Kansas" },
  { abbr: "KY", name: "Kentucky" },
  { abbr: "LA", name: "Louisiana" },
  { abbr: "ME", name: "Maine" },
  { abbr: "MD", name: "Maryland" },
  { abbr: "MA", name: "Massachusetts" },
  { abbr: "MI", name: "Michigan" },
  { abbr: "MN", name: "Minnesota" },
  { abbr: "MS", name: "Mississippi" },
  { abbr: "MO", name: "Missouri" },
  { abbr: "MT", name: "Montana" },
  { abbr: "NE", name: "Nebraska" },
  { abbr: "NV", name: "Nevada" },
  { abbr: "NH", name: "New Hampshire" },
  { abbr: "NJ", name: "New Jersey" },
  { abbr: "NM", name: "New Mexico" },
  { abbr: "NY", name: "New York" },
  { abbr: "NC", name: "North Carolina" },
  { abbr: "ND", name: "North Dakota" },
  { abbr: "OH", name: "Ohio" },
  { abbr: "OK", name: "Oklahoma" },
  { abbr: "OR", name: "Oregon" },
  { abbr: "PA", name: "Pennsylvania" },
  { abbr: "RI", name: "Rhode Island" },
  { abbr: "SC", name: "South Carolina" },
  { abbr: "SD", name: "South Dakota" },
  { abbr: "TN", name: "Tennessee" },
  { abbr: "TX", name: "Texas" },
  { abbr: "UT", name: "Utah" },
  { abbr: "VT", name: "Vermont" },
  { abbr: "VA", name: "Virginia" },
  { abbr: "WA", name: "Washington" },
  { abbr: "WV", name: "West Virginia" },
  { abbr: "WI", name: "Wisconsin" },
  { abbr: "WY", name: "Wyoming" },
  { abbr: "DC", name: "District of Columbia" },
  { abbr: "PR", name: "Puerto Rico" },
  { abbr: "VI", name: "U.S. Virgin Islands" },
  { abbr: "GU", name: "Guam" },
  { abbr: "AS", name: "American Samoa" },
  { abbr: "MP", name: "Northern Mariana Islands" },
  { abbr: "AA", name: "Armed Forces Americas" },
  { abbr: "AE", name: "Armed Forces Europe" },
  { abbr: "AP", name: "Armed Forces Pacific" },
];

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "primary_residence", label: "Primary Residence" },
  { value: "rental", label: "Rental Property" },
  { value: "home_office", label: "Home Office" },
  { value: "vacation", label: "Vacation Home" },
];

type FieldErrors = Partial<Record<"address" | "city" | "state" | "zip", string>>;

const EXPIRY_OPTIONS: { value: ExpiryDays; label: string }[] = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: null, label: "Never" },
];

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function SettingsPage(): ReactElement {
  const prefix = useRoutePrefix();
  const { signOut } = useAuth();
  const { preference: themePreference, setPreference: setThemePreference } = useTheme();
  const { manifest, attachmentsFolderId, attachmentsFolderName, saveProperty } = useStorage();
  const property = manifest?.property;

  const [address, setAddress] = useState(property?.address ?? "");
  const [address2, setAddress2] = useState(property?.address2 ?? "");
  const [city, setCity] = useState(property?.city ?? "");
  const [state, setState] = useState(property?.state ?? "");
  const [zip, setZip] = useState(property?.zip ?? "");
  const [propertyType, setPropertyType] = useState<PropertyType>(
    property?.propertyType ?? "primary_residence",
  );
  const [sqftTotal, setSqftTotal] = useState(
    property?.sqftTotal != null ? String(property.sqftTotal) : "",
  );
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (property == null) return;
    setAddress(property.address);
    setAddress2(property.address2 ?? "");
    setCity(property.city);
    setState(property.state);
    setZip(property.zip);
    setPropertyType(property.propertyType);
    setSqftTotal(property.sqftTotal != null ? String(property.sqftTotal) : "");
  }, [property]);

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // BYOK key state
  const [keyInput, setKeyInput] = useState("");
  const [sessionOnly, setSessionOnly] = useState(false);
  const [expiryDays, setExpiryDays] = useState<ExpiryDays>(getKeyExpiry());
  const [hasKey, setHasKey] = useState(getGeminiKey() != null);
  const [keyIsSessionOnly, setKeyIsSessionOnly] = useState(isSessionOnly());
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "valid" | "invalid">("idle");

  // Budget state
  const [budget, setBudget] = useState<UsageBudget>(getBudgetSettings());
  const usage = getUsageCounters();

  function clearFieldError(key: "address" | "city" | "state" | "zip"): void {
    setFieldErrors((fe) => {
      const copy = { ...fe };
      delete copy[key];
      return copy;
    });
  }

  function handleZipChange(raw: string): void {
    const digits = raw.replace(/\D/g, "").slice(0, 9);
    setZip(digits.length <= 5 ? digits : `${digits.slice(0, 5)}-${digits.slice(5)}`);
  }

  function handleSaveProperty(e: React.SyntheticEvent<HTMLFormElement>): void {
    e.preventDefault();
    const addressTrimmed = address.trim();
    const errors: FieldErrors = {};

    if (addressTrimmed === "") {
      errors.address = "Please enter your street address.";
    } else if (addressTrimmed.length < 5 || !/[a-zA-Z]/.test(addressTrimmed) || !/\d/.test(addressTrimmed)) {
      errors.address = "Include a house number and street name — e.g. 123 Main St.";
    }
    if (city.trim().length < 2) {
      errors.city = city.trim() === "" ? "Please enter your city." : "City name must be at least 2 characters.";
    }
    if (state.trim() === "") {
      errors.state = "Please select a state.";
    }
    if (zip.trim() === "") {
      errors.zip = "Please enter your ZIP code.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSaveError("");
    setSaveStatus("saving");
    void saveProperty({
      address: addressTrimmed,
      ...(address2.trim() !== "" ? { address2: address2.trim() } : {}),
      city: city.trim(),
      state: state.trim(),
      zip,
      propertyType,
      ...(sqftTotal !== "" ? { sqftTotal: Number(sqftTotal) } : {}),
    }).then((result) => {
      if (result.ok) {
        setSaveStatus("saved");
        setTimeout(() => { setSaveStatus("idle"); }, 2000);
      } else {
        setSaveStatus("error");
        setSaveError(`Couldn't save your property: ${result.error.message}`);
      }
    });
  }

  function handleSaveKey(): void {
    if (keyInput.trim().length === 0) return;
    saveGeminiKey(keyInput.trim(), { expiryDays, sessionOnly });
    setHasKey(true);
    setKeyIsSessionOnly(sessionOnly);
    setKeyInput("");
    setTestStatus("idle");
    trackBYOKKeySaved(sessionOnly ? "session" : String(expiryDays ?? "never"));
  }

  function handleRemoveKey(): void {
    clearGeminiKey();
    setHasKey(false);
    setKeyIsSessionOnly(false);
    setTestStatus("idle");
  }

  function handleTestKey(): void {
    const key = keyInput.trim().length > 0 ? keyInput.trim() : getGeminiKey();
    if (key == null) return;
    setTestStatus("testing");
    void testGeminiKey(key).then((result) => {
      setTestStatus(result.ok ? "valid" : "invalid");
    });
  }

  function handleSaveBudget(): void {
    saveBudgetSettings(budget);
  }

  function handleClearData(): void {
    trackClearAllData();
    void (async (): Promise<void> => {
      signOut();
      await clearLocalDeviceData();
      window.location.href = "/";
    })();
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Settings</h1>

      {/* Appearance */}
      <div className="space-y-4 rounded-lg border p-4">
        <h2 className="text-lg font-medium">Appearance</h2>
        <div
          role="radiogroup"
          aria-label="Theme"
          className="inline-flex gap-1 rounded-md border bg-muted/30 p-1"
        >
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={themePreference === value}
              onClick={() => { setThemePreference(value); }}
              className={`flex cursor-pointer items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
                themePreference === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Property Profile */}
      <form onSubmit={handleSaveProperty} className="space-y-4 rounded-lg border p-4">
        <h2 className="text-lg font-medium">Your Property</h2>
        <p className="text-sm text-muted-foreground">
          Set your property details once — they apply to all projects.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="address" className="mb-1 block text-xs font-medium text-muted-foreground">
              Street Address <span className="text-destructive">*</span>
            </label>
            <input
              id="address"
              type="text"
              required
              minLength={5}
              value={address}
              onChange={(e) => { setAddress(e.target.value); clearFieldError("address"); }}
              placeholder="123 Main St"
              autoComplete="street-address"
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring${fieldErrors.address != null ? " border-destructive" : ""}`}
            />
            {fieldErrors.address != null && (
              <p className="mt-1 text-xs text-destructive">{fieldErrors.address}</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="address2" className="mb-1 block text-xs font-medium text-muted-foreground">
              Street Address 2 <span className="text-xs font-normal">(optional)</span>
            </label>
            <input
              id="address2"
              type="text"
              value={address2}
              onChange={(e) => { setAddress2(e.target.value); }}
              placeholder="Apt, suite, unit, etc."
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="city" className="mb-1 block text-xs font-medium text-muted-foreground">
              City <span className="text-destructive">*</span>
            </label>
            <input
              id="city"
              type="text"
              required
              minLength={2}
              value={city}
              onChange={(e) => { setCity(e.target.value.replace(/\d/g, "")); clearFieldError("city"); }}
              autoComplete="address-level2"
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring${fieldErrors.city != null ? " border-destructive" : ""}`}
            />
            {fieldErrors.city != null && (
              <p className="mt-1 text-xs text-destructive">{fieldErrors.city}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="state" className="mb-1 block text-xs font-medium text-muted-foreground">
                State <span className="text-destructive">*</span>
              </label>
              <select
                id="state"
                required
                value={state}
                onChange={(e) => { setState(e.target.value); clearFieldError("state"); }}
                autoComplete="address-level1"
                className={`w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring${fieldErrors.state != null ? " border-destructive" : ""}`}
              >
                <option value="">State…</option>
                {US_STATES.map((s) => (
                  <option key={s.abbr} value={s.abbr}>{s.abbr} — {s.name}</option>
                ))}
              </select>
              {fieldErrors.state != null && (
                <p className="mt-1 text-xs text-destructive">{fieldErrors.state}</p>
              )}
            </div>
            <div>
              <label htmlFor="zip" className="mb-1 block text-xs font-medium text-muted-foreground">
                ZIP <span className="text-destructive">*</span>
              </label>
              <input
                id="zip"
                type="text"
                inputMode="numeric"
                required
                maxLength={10}
                value={zip}
                onChange={(e) => { handleZipChange(e.target.value); clearFieldError("zip"); }}
                placeholder="12345"
                autoComplete="postal-code"
                className={`w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring${fieldErrors.zip != null ? " border-destructive" : ""}`}
              />
              {fieldErrors.zip != null && (
                <p className="mt-1 text-xs text-destructive">{fieldErrors.zip}</p>
              )}
            </div>
          </div>
          <div>
            <label htmlFor="propertyType" className="mb-1 block text-xs font-medium text-muted-foreground">
              Property Type
            </label>
            <select
              id="propertyType"
              value={propertyType}
              onChange={(e) => { setPropertyType(e.target.value as PropertyType); }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {PROPERTY_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sqftTotal" className="mb-1 block text-xs font-medium text-muted-foreground">
              Total Sq Ft
            </label>
            <input
              id="sqftTotal"
              type="number"
              min="0"
              value={sqftTotal}
              onChange={(e) => { setSqftTotal(e.target.value); }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        {saveError !== "" && (
          <p className="text-sm text-destructive">{saveError}</p>
        )}
        <button
          type="submit"
          disabled={saveStatus === "saving"}
          className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved ✓" : "Save Property"}
        </button>
      </form>

      {/* BYOK API Key */}
      <div className="space-y-4 rounded-lg border p-4">
        <h2 className="text-lg font-medium">Gemini API Key (BYOK)</h2>
        <p className="text-sm text-muted-foreground">
          Enter your Google Gemini API key to enable AI-powered receipt extraction.
          The key is stored locally and never sent to any server other than Google.
        </p>

        {hasKey ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-block size-2 rounded-full bg-green-500" />
              <span className="text-sm font-medium text-green-700">
                Key configured{keyIsSessionOnly ? " (session only)" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleTestKey}
                disabled={testStatus === "testing"}
                className="cursor-pointer rounded-md border px-3 py-2 text-sm hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {testStatus === "testing" ? "Testing…" : "Test Key"}
              </button>
              <button
                type="button"
                onClick={handleRemoveKey}
                className="cursor-pointer rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Remove Key
              </button>
            </div>
            {testStatus === "valid" && (
              <p className="text-sm text-green-600">Key is valid and working.</p>
            )}
            {testStatus === "invalid" && (
              <p className="text-sm text-red-600">Key is invalid or restricted. Check your API key.</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Enter API key…"
                autoComplete="off"
                value={keyInput}
                onChange={(e) => { setKeyInput(e.target.value); }}
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={handleSaveKey}
                disabled={keyInput.trim().length === 0}
                className="cursor-pointer rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save Key
              </button>
              <button
                type="button"
                onClick={handleTestKey}
                disabled={keyInput.trim().length === 0 || testStatus === "testing"}
                className="cursor-pointer rounded-md border px-3 py-2 text-sm hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {testStatus === "testing" ? "Testing…" : "Test"}
              </button>
            </div>
            {testStatus === "valid" && (
              <p className="text-sm text-green-600">Key is valid and working.</p>
            )}
            {testStatus === "invalid" && (
              <p className="text-sm text-red-600">Key is invalid or restricted.</p>
            )}

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sessionOnly}
                  onChange={(e) => { setSessionOnly(e.target.checked); }}
                  className="rounded border"
                />
                Session only (don&apos;t store in this browser)
              </label>
            </div>

            {!sessionOnly && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Key expires after:</span>
                <select
                  value={expiryDays == null ? "null" : String(expiryDays)}
                  onChange={(e) => {
                    setExpiryDays(e.target.value === "null" ? null : Number(e.target.value) as ExpiryDays);
                  }}
                  className="rounded-md border bg-background px-2 py-1 text-xs outline-none"
                >
                  {EXPIRY_OPTIONS.map((opt) => (
                    <option key={String(opt.value)} value={opt.value == null ? "null" : String(opt.value)}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Your key is sent only to Google&apos;s Gemini API over HTTPS. It is never logged or
          sent to any other server.
        </p>
      </div>

      {/* Usage Budget */}
      <div className="space-y-4 rounded-lg border p-4">
        <h2 className="text-lg font-medium">AI Usage Limits</h2>
        <p className="text-sm text-muted-foreground">
          Protect against runaway API usage. Limits pause extractions until reset.
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="maxCallsSession" className="mb-1 block text-xs font-medium text-muted-foreground">
              Max calls / session
            </label>
            <input
              id="maxCallsSession"
              type="number"
              min="1"
              value={budget.maxAiCallsPerSession}
              onChange={(e) => { setBudget((b) => ({ ...b, maxAiCallsPerSession: Number(e.target.value) || 50 })); }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="maxCallsDay" className="mb-1 block text-xs font-medium text-muted-foreground">
              Max calls / day
            </label>
            <input
              id="maxCallsDay"
              type="number"
              min="1"
              value={budget.maxAiCallsPerDay}
              onChange={(e) => { setBudget((b) => ({ ...b, maxAiCallsPerDay: Number(e.target.value) || 200 })); }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="maxTokensDay" className="mb-1 block text-xs font-medium text-muted-foreground">
              Max tokens / day
            </label>
            <input
              id="maxTokensDay"
              type="number"
              min="1000"
              step="100000"
              value={budget.maxAiTokensPerDay}
              onChange={(e) => { setBudget((b) => ({ ...b, maxAiTokensPerDay: Number(e.target.value) || 2_000_000 })); }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Today: {usage.dailyCalls} calls, ~{usage.dailyTokens.toLocaleString()} tokens
          · This session: {usage.sessionCalls} calls
        </div>

        <button
          type="button"
          onClick={handleSaveBudget}
          className="cursor-pointer rounded-md border px-3 py-2 text-sm hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
        >
          Save Limits
        </button>
      </div>

      {/* Google Drive storage */}
      <div className="space-y-3 rounded-lg border p-4">
        <h2 className="text-lg font-medium">Google Drive storage</h2>
        <p className="text-sm text-muted-foreground">
          Project records are stored in a hidden <code className="text-xs">manifest.json</code> file
          in your Drive app data folder (not visible in normal Drive browsing). Receipts and invoices
          live in a visible folder, organized into one subfolder per project.
        </p>
        <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
          <li>
            Index: <span className="font-medium text-foreground">manifest.json</span> (hidden app data)
          </li>
          <li>
            Attachments root:{" "}
            <span className="font-medium text-foreground">{attachmentsFolderName}</span>
          </li>
        </ul>
        {attachmentsFolderId != null ? (
          <a
            href={`https://drive.google.com/drive/folders/${attachmentsFolderId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-primary hover:underline"
          >
            Open attachments folder in Google Drive
          </a>
        ) : (
          <p className="text-sm text-muted-foreground">
            The attachments folder is created when you upload your first receipt
            {manifest != null ? "" : " (sign in to sync)"}.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          To fully remove your data from Google, delete the visible attachments folder and revoke
          this app&apos;s Drive access in your Google Account settings. The hidden app data folder
          can be cleared from Google Drive → Settings → Manage apps.
        </p>
        <Link
          to={`${prefix}/settings/diagnostics`}
          className="inline-block text-sm text-primary hover:underline"
        >
          View storage diagnostics
        </Link>
      </div>

      {/* Clear All Data */}
      <div className="space-y-4 rounded-lg border border-red-200 p-4">
        <h2 className="text-lg font-medium text-red-600">Danger Zone</h2>
        <p className="text-sm text-muted-foreground">
          Clear all locally stored data including API keys, preferences, and cached
          manifest data. Your data on Google Drive is not affected.
        </p>
        {showClearConfirm ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClearData}
              className="cursor-pointer rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Yes, clear everything
            </button>
            <button
              type="button"
              onClick={() => { setShowClearConfirm(false); }}
              className="cursor-pointer rounded-md border px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setShowClearConfirm(true); }}
            className="cursor-pointer rounded-md border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            Clear All Local Data
          </button>
        )}
      </div>
    </div>
  );
}
